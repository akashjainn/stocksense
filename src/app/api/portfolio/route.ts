import { prisma } from "@/lib/db";
import { buildProvider } from "@/lib/providers/prices";
import dayjs from "dayjs";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("accountId") || undefined;
  try {
    const txns = await prisma.transaction.findMany({
      where: accountId ? { accountId } : undefined,
      orderBy: { tradeDate: "asc" },
      include: { security: true },
    });
  const holdings = new Map<string, { symbol: string; qty: number; cost: number }>();
  let cash = 0;
  for (const t of txns) {
    if (t.type === "CASH") {
      cash += Number(t.price ?? 0);
      continue;
    }
    const sym = t.security?.symbol;
    if (!sym) continue;
    const qty = t.qty != null ? Number(t.qty) : 0;
    const px = t.price != null ? Number(t.price) : 0;
    if (t.type === "BUY") {
      const h = holdings.get(sym) || { symbol: sym, qty: 0, cost: 0 };
      h.qty += qty;
      h.cost += qty * px;
      cash -= qty * px;
      holdings.set(sym, h);
    } else if (t.type === "SELL") {
      const h = holdings.get(sym) || { symbol: sym, qty: 0, cost: 0 };
      h.qty -= qty;
      cash += qty * px;
      holdings.set(sym, h);
    }
  }
  const positions = Array.from(holdings.values()).filter((p) => p.qty > 0);
  const symbols = positions.map((p) => p.symbol);
  
  // Handle empty portfolio case
  if (positions.length === 0) {
    const curve: { t: string; v: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = dayjs().subtract(i, "day").format("YYYY-MM-DD");
      curve.push({ t: d, v: cash });
    }
    return Response.json({ 
      cash, 
      totalCost: 0, 
      totalValue: cash, 
      positions: [], 
      equityCurve: curve 
    });
  }
  
  // Try to use latest stored price; fallback to provider quote
  const latestBySymbol: Record<string, number> = {};
  if (symbols.length) {
    const latest = await prisma.price.findMany({
      where: { security: { symbol: { in: symbols } } },
      orderBy: [{ securityId: "asc" }, { asOf: "desc" }],
      take: symbols.length, // heuristic: one per symbol
      include: { security: true },
    });
    for (const p of latest) latestBySymbol[p.security.symbol] = Number(p.close);
    // Fill missing via provider
    const missing = symbols.filter((s) => latestBySymbol[s] == null);
    if (missing.length) {
      const list = await buildProvider().getQuote(missing as string[]);
      for (const q of list) {
        if (q.price != null) latestBySymbol[q.symbol] = q.price;
      }
    }
  }
  const enriched = positions.map((p) => {
    const price = latestBySymbol[p.symbol];
    const value = price != null ? p.qty * price : undefined;
    const pnl = value != null ? value - p.cost : undefined;
    const pnlPct = pnl != null && p.cost > 0 ? (pnl / p.cost) * 100 : undefined;
    return { ...p, price, value, pnl, pnlPct };
  });
  const totalCost = enriched.reduce((s, p) => s + p.cost, 0);
  const totalEquity = enriched.reduce((s, p) => s + (p.value ?? 0), 0) + cash;

  // Build a simple equity curve over last 30 days using stored prices if present
  const start = dayjs().subtract(30, "day").startOf("day").toDate();
  const prices = await prisma.price.findMany({
    where: { security: { symbol: { in: symbols } }, asOf: { gte: start } },
    orderBy: { asOf: "asc" },
    include: { security: true },
  });
  const byDate: Record<string, number> = {};
  for (const p of prices) {
    // naive: value = latest position qty * close; ignores position changes over time for now
    const pos = positions.find((x) => x.symbol === p.security.symbol);
    if (!pos) continue;
    const key = dayjs(p.asOf).format("YYYY-MM-DD");
    byDate[key] = (byDate[key] || 0) + pos.qty * Number(p.close);
  }
  // Coerce to array; fill gaps; add cash as flat
  const curve: { t: string; v: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = dayjs().subtract(i, "day").format("YYYY-MM-DD");
    const v = (byDate[d] ?? (curve.length ? curve[curve.length - 1].v - cash : 0)) + cash;
    curve.push({ t: d, v });
  }

    return Response.json({ cash, totalCost, totalValue: totalEquity, positions: enriched, equityCurve: curve });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: "Portfolio fetch failed", detail: msg }, { status: 500 });
  }
}
