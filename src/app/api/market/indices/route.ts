import { NextResponse } from 'next/server';
import { fetchMajorIndices } from '@/lib/api/market';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Simple in-memory cache (per server instance) to reduce FMP calls
let cache: { data: Record<string, any>; ts: number } | null = null;
const TTL_MS = 30_000; // 30s

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < TTL_MS) {
      return NextResponse.json(cache.data, { headers: { 'x-cache': 'HIT' } });
    }
    const data = await fetchMajorIndices();
    cache = { data, ts: Date.now() };
    return NextResponse.json(data, { headers: { 'x-cache': 'MISS' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: 'indices_fetch_failed', message: msg }, { status: 500 });
  }
}
