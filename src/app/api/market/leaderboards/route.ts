import { NextResponse } from 'next/server';
import { fetchLeaderboards, type ListRow } from '@/lib/api/market';
import { getUsage } from '@/lib/fmpClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface LeaderboardData { gainers: ListRow[]; losers: ListRow[]; actives: ListRow[] }
interface CacheEntry { data: LeaderboardData; ts: number }
let cache: CacheEntry | null = null;
let lastGood: CacheEntry | null = null;
const TTL_MS = 45_000; // 45s fresh
const MAX_FALLBACK_AGE_MS = 20 * 60 * 1000; // 20m acceptable stale window
const THRESHOLD = Number(process.env.FMP_FALLBACK_THRESHOLD || 5);

export async function GET() {
  try {
    const usage = await getUsage();
    if (cache && Date.now() - cache.ts < TTL_MS) {
      return NextResponse.json(cache.data, { headers: { 'x-cache': 'HIT', 'x-fmp-used': String(usage.used), 'x-fmp-remaining': String(usage.remaining) } });
    }
    const quotaLow = usage.remaining <= THRESHOLD;
    if (quotaLow && lastGood && Date.now() - lastGood.ts < MAX_FALLBACK_AGE_MS) {
      return NextResponse.json(lastGood.data, { headers: { 'x-cache': cache ? 'STALE-HIT' : 'MISS', 'x-fmp-used': String(usage.used), 'x-fmp-remaining': String(usage.remaining), 'x-fallback-reason': 'quota-low' } });
    }
    const data = await fetchLeaderboards();
    cache = { data, ts: Date.now() };
    lastGood = cache;
    return NextResponse.json(data, { headers: { 'x-cache': 'MISS', 'x-fmp-used': String(usage.used), 'x-fmp-remaining': String(usage.remaining) } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[api/market/leaderboards] fetch failed:', msg);
    // Provide mock fallback list to avoid blank UI; clearly marked.
    if (lastGood) {
      return NextResponse.json(lastGood.data, { headers: { 'x-cache': 'FALLBACK-LASTGOOD', 'x-error': msg, 'x-fallback-reason': 'error-lastgood' } });
    }
    const mock = (prefix:string): ListRow[] => Array.from({length:6}).map((_,i)=>({
      symbol: `${prefix}${i+1}`,
      name: `Mock ${prefix} ${i+1}`,
      price: 0,
      changePct: 0,
      change: 0,
      volume: 0,
    }));
    return NextResponse.json({ error: 'leaderboards_fetch_failed', message: msg, data: { gainers: mock('G'), losers: mock('L'), actives: mock('A') } }, { status: 500 });
  }
}
