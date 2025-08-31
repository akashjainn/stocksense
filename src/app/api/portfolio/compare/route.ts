import { NextRequest } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { buildProvider } from "@/lib/providers/prices";
import { getTop30Tickers } from "@/lib/benchmarks/top30";
import type { ObjectId } from "mongodb";

function pct(a?: number, b?: number) {
  if (a == null || b == null || b === 0) return undefined;
  return ((a - b) / b) * 100;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("accountId") || undefined;
  // Build current portfolio snapshot similar to /api/portfolio
  const db = await getMongoDb();
  type Tx = { _id: ObjectId; accountId: string; symbol?: string; type: "BUY"|"SELL"|"DIV"|"CASH"; qty?: number|null; price?: number|null; tradeDate: Date };
  const txns = await db
    .collection("transactions")
    .find(accountId ? { accountId } : {}, { sort: { tradeDate: 1 } })
    .toArray();
  const holdings = new Map<string, { symbol: string; qty: number; cost: number }>();
  let cash = 0;
  for (const t of txns as Tx[]) {
    if (t.type === "CASH") { cash += Number(t.price ?? 0); continue; }
    const sym: string | undefined = t.symbol; if (!sym) continue;
    const qty = t.qty != null ? Number(t.qty) : 0;
    const px = t.price != null ? Number(t.price) : 0;
    const h = holdings.get(sym) || { symbol: sym, qty: 0, cost: 0 };
    if (t.type === "BUY") { h.qty += qty; h.cost += qty * px; cash -= qty * px; }
    else if (t.type === "SELL") { h.qty -= qty; cash += qty * px; }
    holdings.set(sym, h);
  }
  const positions = Array.from(holdings.values()).filter((p) => p.qty > 0);
  const symbols = positions.map((p) => p.symbol);

  const latestBySymbol: Record<string, number> = {};
  if (symbols.length) {
    const list = await buildProvider().getQuote(symbols);
    for (const q of list) if (q.price != null) latestBySymbol[q.symbol] = q.price;
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
  const totalPnl = totalEquity - (totalCost + cash);
  const totalPnlPct = pct(totalEquity, totalCost + cash);

  // Benchmark: Top 30 equally weighted vs. user portfolio symbols
  const benchmarkSyms = getTop30Tickers();
  const benchQuotes = await buildProvider().getQuote(benchmarkSyms);
  const benchAvg = benchQuotes.reduce((s, q) => s + (q.price ?? 0), 0) / (benchQuotes.length || 1);

  // For a simple comparable metric, compute each position's ROR vs. its avg cost if available from txns
  const avgCostBySymbol: Record<string, number> = {};
  for (const p of positions) {
    // naive average cost = cost / qty
    avgCostBySymbol[p.symbol] = p.qty > 0 ? p.cost / p.qty : 0;
  }
  const comp = enriched.map((p) => {
    const avg = avgCostBySymbol[p.symbol] || 0;
    const ror = p.price != null && avg > 0 ? pct(p.price, avg) : undefined;
    return { symbol: p.symbol, qty: p.qty, price: p.price, value: p.value, cost: p.cost, ror };
  });

  return Response.json({
    portfolio: {
      cash,
      totalValue: totalEquity,
      totalCost,
      totalPnl,
      totalPnlPct,
      positions: comp,
    },
    benchmark: {
      name: "Top 30 Mega/Large Cap (EW)",
      tickers: benchmarkSyms,
      avgPrice: benchAvg,
    },
  });
}
