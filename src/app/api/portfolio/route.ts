import { getMongoDb } from "@/lib/mongodb";
import type { ObjectId } from "mongodb";
import { buildProvider } from "@/lib/providers/prices";
import dayjs from "dayjs";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("accountId") || undefined;
  try {
    const db = await getMongoDb();
    const txCol = db.collection("transactions");
    const query = accountId ? { accountId } : {};
    type Tx = {
      _id: ObjectId;
      accountId: string;
      symbol?: string;
      type: "BUY" | "SELL" | "DIV" | "CASH";
      qty?: number | null;
      price?: number | null;
      tradeDate: Date;
    };
    const txns = await txCol
      .find(query, { sort: { tradeDate: 1 }, projection: { _id: 0 } })
      .toArray();
  const holdings = new Map<string, { symbol: string; qty: number; cost: number }>();
  let cash = 0;
  for (const t of txns as Tx[]) {
      if (t.type === "CASH") {
        cash += Number(t.price ?? 0);
        continue;
      }
      const sym: string | undefined = t.symbol; // stored directly in Mongo tx
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
  return NextResponse.json({ 
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
      try {
        const list = await buildProvider().getQuote(symbols as string[]);
        for (const q of list) {
          if (q.price != null) latestBySymbol[q.symbol] = q.price;
        }
      } catch (provErr) {
        console.error("[/api/portfolio] provider.getQuote failed:", provErr);
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

    // Simple equity curve (flat at current totalEquity for last 30 days)
    const curve: { t: string; v: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = dayjs().subtract(i, "day").format("YYYY-MM-DD");
      curve.push({ t: d, v: totalEquity });
    }

  return NextResponse.json({ cash, totalCost, totalValue: totalEquity, positions: enriched, equityCurve: curve });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
  console.error("[/api/portfolio] GET failed:", e);
  return NextResponse.json({ error: "Portfolio fetch failed", detail: msg }, { status: 500 });
  }
}
