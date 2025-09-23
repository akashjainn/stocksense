import { NextRequest, NextResponse } from "next/server";
import { fetchYahooQuoteSummary } from "@/lib/yahoo";
import { cached } from '@/lib/cache';

// Simple in-memory cache to soften provider latency / transient failures
const QUOTE_CACHE = new Map<string, { ts: number; data: Quote }>();
const CACHE_TTL_MS = 15_000; // 15s quote freshness window

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Quote = {
  symbol: string;
  price: number | null;
  change: number | null;
  percent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  latestTradingDay?: string | null;
};

function toNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

async function fetchFromAlphaVantage(symbol: string): Promise<Quote | null> {
  const key = process.env.ALPHA_VANTAGE_KEY || process.env.ALPHAVANTAGE_API_KEY || process.env.ALPHADVANTAGE_API_KEY || process.env.ALPHAVANTAGE_KEY || process.env.ALPHA_VANTAGE_KEY || process.env.ALPHA_KEY || process.env.ALPHA || process.env.ALPHAVANTAGE_APIKEY;
  if (!key) return null;
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${key}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    const g = json?.['Global Quote'];
    if (!g) return null;
    const toNum = (v: unknown) => {
      const n = Number((v as string) ?? NaN); return isFinite(n) ? n : null;
    };
    const price = toNum(g['05. price']);
    const open = toNum(g['02. open']);
    const high = toNum(g['03. high']);
    const low = toNum(g['04. low']);
    const prev = toNum(g['08. previous close']);
    const change = toNum(g['09. change']);
    const percentStr = (g['10. change percent'] as string) || '';
    const percent = (() => {
      const m = percentStr.match(/(-?\d+(?:\.\d+)?)%/); return m ? Number(m[1]) : null;
    })();
    return {
      symbol,
      price,
      change,
      percent,
      open,
      high,
      low,
      previousClose: prev,
      latestTradingDay: null,
    };
  } catch (e) {
    console.warn('[Quote] Alpha Vantage fallback failed', e);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolRaw = (searchParams.get("symbol") || "").trim();
  if (!symbolRaw) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  const symbol = symbolRaw.toUpperCase();

  try {
    const { value: quote } = await cached<Quote | null>({
      key: `quote:${symbol}`,
      ttlMs: CACHE_TTL_MS,
      staleMs: 60_000, // allow 1m stale serve
      allowNull: false,
      fetcher: async () => {
        // Primary: Yahoo
        let yahooQuote: Quote | null = null;
        try {
          const { headers, values } = await fetchYahooQuoteSummary(symbol, { price: [
            'regularMarketPrice',
            'regularMarketChange',
            'regularMarketChangePercent',
            'regularMarketOpen',
            'regularMarketDayHigh',
            'regularMarketDayLow',
            'regularMarketPreviousClose',
            'regularMarketTime'
          ] });
          const data: Record<string, unknown> = {};
          headers.forEach((h, i) => (data[h] = values[i]));
          yahooQuote = {
            symbol,
            price: toNum(data.regularMarketPrice),
            change: toNum(data.regularMarketChange),
            percent: toNum(data.regularMarketChangePercent),
            open: toNum(data.regularMarketOpen),
            high: toNum(data.regularMarketDayHigh),
            low: toNum(data.regularMarketDayLow),
            previousClose: toNum(data.regularMarketPreviousClose),
            latestTradingDay: typeof data.regularMarketTime === 'number' ? new Date((data.regularMarketTime as number) * 1000).toISOString().slice(0, 10) : null,
          };
        } catch (err) {
          console.warn('[Quote] Yahoo primary failed:', err);
        }
        let finalQuote = yahooQuote;
        if (!finalQuote || finalQuote.price == null) {
          const av = await fetchFromAlphaVantage(symbol);
          if (av && av.price != null) finalQuote = av;
        }
        return finalQuote ?? null;
      }
    });
    if (!quote) return NextResponse.json({ ok: false, error: 'quote unavailable' }, { status: 502 });
    return NextResponse.json({ ok: true, quote });
  } catch (e) {
    console.error('[Quote] Fatal error', e);
    return NextResponse.json({ ok: false, error: 'internal error' }, { status: 500 });
  }
}
