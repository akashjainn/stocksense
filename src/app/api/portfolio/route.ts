import { getMongoDb } from "@/lib/mongodb";
import type { ObjectId } from "mongodb";
import { buildProvider } from "@/lib/providers/prices";
import { getDailyBars } from "@/lib/market/providers/alpaca";
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
      // Fees are stored in tx.price? We don't persist fee today on tx, but if present we would subtract from cash.
      cash -= qty * px;
      holdings.set(sym, h);
    } else if (t.type === "SELL") {
      const h = holdings.get(sym) || { symbol: sym, qty: 0, cost: 0 };
      // Reduce cost using average cost method for remaining lots
      const sellQty = Math.min(qty, Math.max(h.qty, 0));
      const avgCost = h.qty > 0 ? h.cost / h.qty : 0;
      h.qty = h.qty - qty;
      if (h.qty < 0) h.qty = 0; // guard against over-sell
      if (sellQty > 0 && avgCost > 0) {
        h.cost = Math.max(0, h.cost - sellQty * avgCost);
      }
      cash += qty * px;
      holdings.set(sym, h);
    }
  }
  const positions = Array.from(holdings.values()).filter((p) => p.qty > 0);
  // Normalize symbols for providers (e.g., BRK.B -> BRK.B or BRK-B depending on provider).
  const normalize = (s: string) => s.replace("/", "-");
  const symbols = positions.map((p) => normalize(p.symbol));
  
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
  // Optional: compute market-baseline cost using historical daily close at buy dates
  let baselineBySymbol: Record<string, { baselineCost: number; qty: number }> = {};
  try {
    if (symbols.length) {
      // Build per-symbol trade events and compute earliest buy date
      type Ev = { date: string; type: "BUY" | "SELL"; qty: number; symbol: string };
      const events: Ev[] = [];
      let minDate: string | null = null;
      for (const t of txns as Tx[]) {
        const sym = t.symbol;
        if (!sym || (t.type !== "BUY" && t.type !== "SELL")) continue;
        const d = dayjs(t.tradeDate).format("YYYY-MM-DD");
        events.push({ date: d, type: t.type, qty: Number(t.qty ?? 0), symbol: sym });
        if (t.type === "BUY") {
          if (!minDate || d < minDate) minDate = d;
        }
      }
      if (events.length && minDate) {
        const toDate = dayjs().format("YYYY-MM-DD");
        // Fetch historical bars once per symbol for date span
        const priceMap: Record<string, Map<string, number>> = {};
        for (const s of symbols) {
          try {
            const bars = await getDailyBars([s], minDate, toDate);
            const m = new Map<string, number>();
            for (const b of bars) {
              const d = dayjs(b.t).format("YYYY-MM-DD");
              m.set(d, b.c);
            }
            priceMap[s] = m;
          } catch (err) {
            console.error(`[portfolio] historical fetch failed for ${s}:`, err);
            priceMap[s] = new Map();
          }
        }

        // Helper to get close price for or before date (up to 5 days back)
        function getCloseForDate(sym: string, date: string): number | undefined {
          const m = priceMap[sym];
          if (!m) return undefined;
          let d = dayjs(date);
          for (let i = 0; i < 6; i++) {
            const key = d.format("YYYY-MM-DD");
            const px = m.get(key);
            if (px != null) return px;
            d = d.subtract(1, "day");
          }
          return undefined;
        }

        // Build FIFO lots with market close at buy date
        const lotsBySymbol: Record<string, Array<{ qty: number; price: number }>> = {};
        for (const ev of events) {
          if (!lotsBySymbol[ev.symbol]) lotsBySymbol[ev.symbol] = [];
          if (ev.type === "BUY") {
            const px = getCloseForDate(ev.symbol, ev.date);
            // if missing, skip lot (won't contribute to baseline)
            if (px != null && ev.qty > 0) {
              lotsBySymbol[ev.symbol].push({ qty: ev.qty, price: px });
            }
          } else if (ev.type === "SELL") {
            let remaining = ev.qty;
            const lots = lotsBySymbol[ev.symbol];
            for (let i = 0; i < lots.length && remaining > 0; i++) {
              const take = Math.min(remaining, lots[i].qty);
              lots[i].qty -= take;
              remaining -= take;
            }
            // drop depleted lots
            lotsBySymbol[ev.symbol] = lots.filter((l) => l.qty > 0);
          }
        }

        baselineBySymbol = {};
        for (const s of symbols) {
          const lots = lotsBySymbol[s] || [];
          const qty = lots.reduce((sum, l) => sum + l.qty, 0);
          const baselineCost = lots.reduce((sum, l) => sum + l.qty * l.price, 0);
          baselineBySymbol[s] = { baselineCost, qty };
        }
      }
    }
  } catch (err) {
    console.warn("[/api/portfolio] baseline market computation skipped:", err);
    baselineBySymbol = {};
  }

  const enriched = positions.map((p) => {
    const sym = normalize(p.symbol);
    const price = latestBySymbol[sym];
    const value = price != null ? p.qty * price : undefined;
    const pnl = value != null ? value - p.cost : undefined;
    const pnlPct = pnl != null && p.cost > 0 ? (pnl / p.cost) * 100 : undefined;
    const bm = baselineBySymbol[p.symbol];
    const baselineCostMarket = bm?.qty ? bm.baselineCost : undefined;
    const pnlMarket = value != null && baselineCostMarket != null ? value - baselineCostMarket : undefined;
    const pnlPctMarket = pnlMarket != null && baselineCostMarket && baselineCostMarket > 0 ? (pnlMarket / baselineCostMarket) * 100 : undefined;
    return { ...p, price, value, pnl, pnlPct, baselineCostMarket, pnlMarket, pnlPctMarket };
  });
  const totalCost = enriched.reduce((s, p) => s + p.cost, 0);
  const totalEquity = enriched.reduce((s, p) => s + (p.value ?? 0), 0) + cash;
  const totalsBaseline = enriched.reduce((s, p) => s + (p.baselineCostMarket ?? 0), 0);
  const totalsPnlMarket = enriched.reduce((s, p) => s + (p.pnlMarket ?? 0), 0);

    // Simple equity curve (flat at current totalEquity for last 30 days)
    const curve: { t: string; v: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = dayjs().subtract(i, "day").format("YYYY-MM-DD");
      curve.push({ t: d, v: totalEquity });
    }

  return NextResponse.json({ 
    cash, 
    totalCost, 
    totalValue: totalEquity, 
    positions: enriched, 
    equityCurve: curve,
    totals: { baselineCostMarket: totalsBaseline, pnlMarket: totalsPnlMarket }
  });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
  console.error("[/api/portfolio] GET failed:", e);
  return NextResponse.json({ error: "Portfolio fetch failed", detail: msg }, { status: 500 });
  }
}
