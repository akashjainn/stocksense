import { NextResponse } from 'next/server';
import { fetchMajorIndices, type IndexRow } from '@/lib/api/market';
import { getUsage } from '@/lib/fmpClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Simple in-memory cache (per server instance) to reduce FMP calls
let cache: { data: Record<string, IndexRow>; ts: number } | null = null;
let lastGood: { data: Record<string, IndexRow>; ts: number } | null = null; // survives beyond normal TTL for fallback
const TTL_MS = 30_000; // 30s normal freshness
const MAX_FALLBACK_AGE_MS = 15 * 60 * 1000; // 15m acceptable stale window when quota exhausted
const THRESHOLD = Number(process.env.FMP_FALLBACK_THRESHOLD || 5); // remaining calls at/below triggers fallback

export async function GET() {
  try {
    const usage = await getUsage();

    // If we have a fresh cache within normal TTL
    if (cache && Date.now() - cache.ts < TTL_MS) {
      return NextResponse.json(cache.data, { headers: { 'x-cache': 'HIT', 'x-fmp-used': String(usage.used), 'x-fmp-remaining': String(usage.remaining) } });
    }

    // Quota nearly exhausted: serve lastGood (even if older) to avoid spending final calls
    const quotaLow = usage.remaining <= THRESHOLD;
    if (quotaLow && lastGood && Date.now() - lastGood.ts < MAX_FALLBACK_AGE_MS) {
      return NextResponse.json(lastGood.data, { headers: { 'x-cache': cache ? 'STALE-HIT' : 'MISS', 'x-fmp-used': String(usage.used), 'x-fmp-remaining': String(usage.remaining), 'x-fallback-reason': 'quota-low' } });
    }

    // Fetch new data (may still come from fmpClient cached layer without decrement) and update caches
    const data = await fetchMajorIndices();
    const entry = { data, ts: Date.now() };
    cache = entry;
    lastGood = entry; // always update lastGood on success
    return NextResponse.json(data, { headers: { 'x-cache': 'MISS', 'x-fmp-used': String(usage.used), 'x-fmp-remaining': String(usage.remaining) } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[api/market/indices] fetch failed:', msg);
    // Graceful fallback: return mock zeros so UI renders instead of 500 hard error.
    if (lastGood) {
      return NextResponse.json(lastGood.data, { headers: { 'x-cache': 'FALLBACK-LASTGOOD', 'x-error': msg, 'x-fallback-reason': 'error-lastgood' } });
    }
    const fallback: Record<string, IndexRow> = {
      '^GSPC': { symbol:'^GSPC', price:0, change:0, changesPercentage:0 },
      '^IXIC': { symbol:'^IXIC', price:0, change:0, changesPercentage:0 },
      '^DJI': { symbol:'^DJI', price:0, change:0, changesPercentage:0 },
    };
    return NextResponse.json({ error: 'indices_fetch_failed', message: msg, data: fallback }, { status: 500 });
  }
}
