import { NextResponse } from 'next/server';
import { fetchMajorIndices, type IndexRow } from '@/lib/api/market';
import { getUsage } from '@/lib/fmpClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Simple in-memory cache (per server instance) to reduce FMP calls
let cache: { data: Record<string, IndexRow>; ts: number } | null = null;
const TTL_MS = 30_000; // 30s

export async function GET() {
  try {
    const usage = await getUsage();
    if (cache && Date.now() - cache.ts < TTL_MS) {
      return NextResponse.json(cache.data, { headers: { 'x-cache': 'HIT', 'x-fmp-used': String(usage.used), 'x-fmp-remaining': String(usage.remaining) } });
    }
    const data = await fetchMajorIndices();
    cache = { data, ts: Date.now() };
    return NextResponse.json(data, { headers: { 'x-cache': 'MISS', 'x-fmp-used': String(usage.used), 'x-fmp-remaining': String(usage.remaining) } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[api/market/indices] fetch failed:', msg);
    // Graceful fallback: return mock zeros so UI renders instead of 500 hard error.
    const fallback: Record<string, IndexRow> = {
      '^GSPC': { symbol:'^GSPC', price:0, change:0, changesPercentage:0 },
      '^IXIC': { symbol:'^IXIC', price:0, change:0, changesPercentage:0 },
      '^DJI': { symbol:'^DJI', price:0, change:0, changesPercentage:0 },
    };
    return NextResponse.json({ error: 'indices_fetch_failed', message: msg, data: fallback }, { status: 500 });
  }
}
