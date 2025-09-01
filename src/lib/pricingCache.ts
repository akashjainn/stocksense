import dayjs from "dayjs";
import type { Candle, PriceProvider, Quote } from "./providers/prices";
// Optional Alpaca fallback for candles when AlphaVantage is rate-limited
import { getDailyBars as alpacaGetDailyBars } from "@/lib/market/providers/alpaca";

// Simple in-memory caches with TTLs to avoid API rate limits
const quoteCache = new Map<string, { price: number; ts: number }>();
const candlesCache = new Map<string, { data: Map<string, number>; ts: number }>();

export async function getQuotesCached(
  provider: PriceProvider,
  symbols: string[],
  ttlMs = 60_000
): Promise<Record<string, number>> {
  const now = Date.now();
  const out: Record<string, number> = {};
  const need: string[] = [];

  for (const s of symbols) {
    const hit = quoteCache.get(s);
    if (hit && now - hit.ts < ttlMs) {
      out[s] = hit.price;
    } else {
      need.push(s);
    }
  }

  if (need.length) {
    const quotes: Quote[] = await provider.getQuote(need);
    for (const q of quotes) {
      if (q.price != null && isFinite(q.price) && q.price > 0) {
        quoteCache.set(q.symbol, { price: q.price, ts: now });
        out[q.symbol] = q.price;
      }
    }
  }
  return out;
}

// Returns a date -> close map for the symbol. If not cached (or stale), fetches full history (provider chooses output size).
export async function getCandlesMapCached(
  provider: PriceProvider,
  symbol: string,
  ttlMs = 12 * 60 * 60 * 1000 // 12h
): Promise<Map<string, number>> {
  const now = Date.now();
  const hit = candlesCache.get(symbol);
  if (hit && now - hit.ts < ttlMs) return hit.data;

  // Fetch a broad range to populate cache
  const start = "2000-01-01";
  const end = dayjs().format("YYYY-MM-DD");
  const candles: Candle[] = await provider.getDailyCandles(symbol, start, end);
  const m = new Map<string, number>();
  for (const c of candles) {
    const d = dayjs(c.t).format("YYYY-MM-DD");
    if (c.c != null && isFinite(c.c) && c.c > 0) m.set(d, c.c);
  }
  candlesCache.set(symbol, { data: m, ts: now });
  return m;
}

// Get a latest close for a symbol using cached candles; optionally try Alpaca if primary returns empty
export async function getLatestClose(
  provider: PriceProvider,
  symbol: string
): Promise<number | undefined> {
  // Try primary provider cached candles
  let m = await getCandlesMapCached(provider, symbol);
  if (m && m.size) {
    const latestKey = Array.from(m.keys()).sort().pop();
    const px = latestKey ? m.get(latestKey) : undefined;
    if (px != null && isFinite(px) && px > 0) return px;
  }

  // Try common symbol variants
  const variants = [symbol.replace(/-/g, "."), symbol.replace(/\./g, "/")].filter((s) => s !== symbol);
  for (const v of variants) {
    m = await getCandlesMapCached(provider, v);
    if (m && m.size) {
      const latestKey = Array.from(m.keys()).sort().pop();
      const px = latestKey ? m.get(latestKey) : undefined;
      if (px != null && isFinite(px) && px > 0) return px;
    }
  }

  // Optional Alpaca fallback (only if keys configured and call succeeds)
  try {
    const to = dayjs().format("YYYY-MM-DD");
    const from = dayjs().subtract(21, "day").format("YYYY-MM-DD");
    const bars = await alpacaGetDailyBars([symbol], from, to);
    if (bars && bars.length) {
      const latest = bars.reduce((a, b) => (a.t > b.t ? a : b));
      if (latest.c != null && isFinite(latest.c) && latest.c > 0) return latest.c;
    }
  } catch {
    // ignore – alpaca optional
  }

  return undefined;
}
