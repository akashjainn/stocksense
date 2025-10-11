import { getMongoDb } from "@/lib/mongodb";
import type { ObjectId } from "mongodb";
import { buildProvider } from "@/lib/providers/prices";
import { getQuotesCached, getLatestClose } from "@/lib/pricingCache";
import dayjs from "dayjs";
import { dlog, dwarn, derr } from '@/lib/log';
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
      holdings.set(sym, h);
    }
  }
  const positions = Array.from(holdings.values()).filter((p) => p.qty > 0);
  // Normalize symbols for providers (e.g., BRK.B -> BRK-B) but retain original for reporting
  const normalize = (s: string) => s.replace("/", "-");
  const normalizedByOriginal = new Map<string, string>();
  for (const p of positions) normalizedByOriginal.set(p.symbol, normalize(p.symbol));
  const originalByNormalized = new Map<string, string>();
  for (const [orig, norm] of normalizedByOriginal.entries()) originalByNormalized.set(norm, orig);
  const symbols = Array.from(normalizedByOriginal.values());
  
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
  
  // Try to use provider quotes first (ignore zero/invalid), then fallback to latest daily close
  const latestBySymbol: Record<string, number> = {};
  if (symbols.length) {
    // First try: get quotes from provider
    try {
  dlog('[Portfolio] Fetching quotes for symbols:', symbols);
      const provider = buildProvider();
      const map = await getQuotesCached(provider, symbols as string[]);
  dlog('[Portfolio] Quote map:', map);
      Object.assign(latestBySymbol, map);
    } catch (provErr) {
      console.error("[/api/portfolio] provider.getQuote failed:", provErr);
    }
    
    // Fallback: fetch recent daily candles (provider-based) and use the most recent close if quote missing
    const needFallback = symbols.filter((s) => latestBySymbol[s] == null);
  dlog('[Portfolio] Symbols needing fallback:', needFallback);
    
    if (needFallback.length) {
      for (const s of needFallback) {
        try {
          dlog(`[Portfolio] Trying fallback for ${s}...`);
          const provider = buildProvider();
          const px = await getLatestClose(provider, s);
          if (px != null && isFinite(px) && px > 0) {
            latestBySymbol[s] = px;
            dlog(`[Portfolio] Fallback price for ${s}: $${px}`);
          } else {
            dwarn(`[Portfolio] No fallback price found for ${s}`);
          }
        } catch (e) {
          dwarn(`[portfolio] fallback daily close failed for ${s}:`, e);
        }
      }
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
    // Fetch historical candles once per symbol for date span (provider-based)
    // IMPORTANT: key maps by ORIGINAL symbol (matching txn symbols) for consistent lookups
    const priceMap: Record<string, Map<string, number>> = {};
        const provider = buildProvider();
        for (const s of symbols) {
          try {
            const candles = await provider.getDailyCandles(s, minDate, toDate);
            const m = new Map<string, number>();
            for (const c of candles) {
              const d = dayjs(c.t).format("YYYY-MM-DD");
              m.set(d, c.c);
            }
      const originalSym = originalByNormalized.get(s) || s;
      priceMap[originalSym] = m;
          } catch (err) {
            dwarn(`[portfolio] historical fetch failed for ${s}:`, err);
      const originalSym = originalByNormalized.get(s) || s;
      priceMap[originalSym] = new Map();
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
          const originalSym = originalByNormalized.get(s) || s;
          const lots = lotsBySymbol[originalSym] || [];
          const qty = lots.reduce((sum, l) => sum + l.qty, 0);
          const baselineCost = lots.reduce((sum, l) => sum + l.qty * l.price, 0);
          baselineBySymbol[originalSym] = { baselineCost, qty };
        }
      }
    }
  } catch (err) {
  dwarn("[/api/portfolio] baseline market computation skipped:", err);
    baselineBySymbol = {};
  }

  const enriched = positions.map((p) => {
    const sym = normalizedByOriginal.get(p.symbol) || p.symbol;
    const price = latestBySymbol[sym];
  dlog(`[Portfolio] Symbol: ${p.symbol} -> ${sym}, Price: ${price}, Qty: ${p.qty}, Cost: ${p.cost}`);
    const value = price != null ? p.qty * price : undefined;
    const pnl = value != null ? value - p.cost : undefined;
    const pnlPct = pnl != null && p.cost > 0 ? (pnl / p.cost) * 100 : undefined;
    const bm = baselineBySymbol[p.symbol];
    const baselineCostMarket = bm?.qty ? bm.baselineCost : undefined;
    const pnlMarket = value != null && baselineCostMarket != null ? value - baselineCostMarket : undefined;
    const pnlPctMarket = pnlMarket != null && baselineCostMarket && baselineCostMarket > 0 ? (pnlMarket / baselineCostMarket) * 100 : undefined;
  dlog(`[Portfolio] ${p.symbol}: value=${value}, pnl=${pnl}, pnlPct=${pnlPct?.toFixed(2)}%`);
    return { ...p, price, value, pnl, pnlPct, baselineCostMarket, pnlMarket, pnlPctMarket };
  });
  const totalCost = enriched.reduce((s, p) => s + p.cost, 0);
  const equityOnly = enriched.reduce((s, p) => s + (p.value ?? 0), 0);
  const totalEquityWithCash = equityOnly + cash;
  dlog(`[Portfolio] Total Cost: ${totalCost}, Equity Only: ${equityOnly}, With Cash: ${totalEquityWithCash}, Cash: ${cash}`);
  dlog(`[Portfolio] Position values: ${enriched.map(p => `${p.symbol}:${p.value}`).join(', ')}`);
  const totalsBaseline = enriched.reduce((s, p) => s + (p.baselineCostMarket ?? 0), 0);
  const totalsPnlMarket = enriched.reduce((s, p) => s + (p.pnlMarket ?? 0), 0);

  // Premium-adjusted cost/share (Sheets parity)
  // We pull premium allocations from options lots and subtract net premium from cost basis per symbol.
  // Convention: premiumAllocations.premium is signed (+ received, - paid); fees reduce net premium.
  const premiumAdjustedBySymbol: Record<string, { premiumApplied: number; adjustedCost: number; adjustedPps: number }> = {};
  try {
    if (accountId && enriched.length) {
      const symbolsSet = new Set(enriched.map((p) => p.symbol));
      const dbLots = await db
        .collection("lots")
        .find({ accountId, symbol: { $in: Array.from(symbolsSet) } }, { projection: { _id: 1, symbol: 1 } })
        .toArray();
      const bySymbolLotIds = new Map<string, string[]>();
      for (const lot of dbLots) {
        const id = String(lot._id);
        const arr = bySymbolLotIds.get(lot.symbol) || [];
        arr.push(id);
        bySymbolLotIds.set(lot.symbol, arr);
      }
      const allLotIds = dbLots.map((l) => String(l._id));
      if (allLotIds.length) {
        const allocs = await db
          .collection("premiumAllocations")
          .find({ lotId: { $in: allLotIds } }, { projection: { lotId: 1, premium: 1, fees: 1 } })
          .toArray();
        const netByLot: Record<string, number> = {};
        for (const a of allocs) {
          const lotId = String(a.lotId);
          const delta = Number(a.premium ?? 0) - Number(a.fees ?? 0);
          netByLot[lotId] = (netByLot[lotId] ?? 0) + delta;
        }
        for (const [sym, lotIds] of bySymbolLotIds.entries()) {
          const net = lotIds.reduce((s, id) => s + (netByLot[id] ?? 0), 0);
          const pos = enriched.find((p) => p.symbol === sym);
          if (!pos || pos.qty <= 0) continue;
          const adjustedCost = Math.max(0, pos.cost - net);
          const adjustedPps = adjustedCost / pos.qty;
          premiumAdjustedBySymbol[sym] = { premiumApplied: net, adjustedCost, adjustedPps };
        }
      }
    }
  } catch (e) {
    console.warn("[/api/portfolio] premium adjustment skipped:", e);
  }

  const positionsWithPremium = enriched.map((p) => {
    const prem = premiumAdjustedBySymbol[p.symbol];
    if (!prem) return p;
    return {
      ...p,
      premiumAppliedDollars: prem.premiumApplied,
      costPerSharePremiumAdj: prem.adjustedPps,
      costPremiumAdjusted: prem.adjustedCost,
    } as typeof p & { premiumAppliedDollars: number; costPerSharePremiumAdj: number; costPremiumAdjusted: number };
  });

    // Simple equity curve (flat at current totalEquity for last 30 days)
    const curve: { t: string; v: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = dayjs().subtract(i, "day").format("YYYY-MM-DD");
      // Use equity-only so displayed total matches market value of holdings
      curve.push({ t: d, v: equityOnly });
    }

  return NextResponse.json({ 
    cash, 
    totalCost, 
    // Report equity-only as totalValue (excludes cash) to match expected display
    totalValue: equityOnly,
    // Also include with-cash for consumers that want a net-worth style metric
    totalValueWithCash: totalEquityWithCash,
    positions: positionsWithPremium, 
    equityCurve: curve,
    totals: { baselineCostMarket: totalsBaseline, pnlMarket: totalsPnlMarket }
  });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
  console.error("[/api/portfolio] GET failed:", e);
  return NextResponse.json({ error: "Portfolio fetch failed", detail: msg }, { status: 500 });
  }
}
