import { NextResponse } from 'next/server';
import { fetchLeaderboards } from '@/lib/api/market';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CacheEntry { data: any; ts: number }
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
    return NextResponse.json({ error: 'leaderboards_fetch_failed', message: msg }, { status: 500 });
  }
}
