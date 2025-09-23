import { NextResponse } from 'next/server';
import { fetchLeaderboards, type ListRow } from '@/lib/api/market';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface LeaderboardData { gainers: ListRow[]; losers: ListRow[]; actives: ListRow[] }
interface CacheEntry { data: LeaderboardData; ts: number }
let cache: CacheEntry | null = null;
const TTL_MS = 45_000; // 45s

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < TTL_MS) {
      return NextResponse.json(cache.data, { headers: { 'x-cache': 'HIT' } });
    }
    const data = await fetchLeaderboards();
    cache = { data, ts: Date.now() };
    return NextResponse.json(data, { headers: { 'x-cache': 'MISS' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[api/market/leaderboards] fetch failed:', msg);
    // Provide mock fallback list to avoid blank UI; clearly marked.
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
