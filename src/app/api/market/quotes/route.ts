import { NextRequest, NextResponse } from 'next/server';
import { fmpBatchQuote, fmpGet } from '@/lib/fmpClient';
import { dlog, dwarn, derr } from '@/lib/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface QuoteOut { symbol: string; price: number|null; change: number|null; percent: number|null; source: string; }

// Short-lived in-route memory cache to suppress thundering herds (5s fresh, 20s stale fallback)
interface CacheEntry { value: QuoteOut[]; ts: number; }
const cache = new Map<string, CacheEntry>();
const FRESH_MS = 5_000;
const STALE_MS = 20_000;

function readCache(key: string): { value: QuoteOut[]; state: 'fresh'|'stale' } | null {
  const e = cache.get(key); if (!e) return null; const age = Date.now() - e.ts; if (age < FRESH_MS) return { value: e.value, state: 'fresh' }; if (age < FRESH_MS + STALE_MS) return { value: e.value, state: 'stale' }; return null;
}

function writeCache(key: string, value: QuoteOut[]) { cache.set(key, { value, ts: Date.now() }); }

export async function GET(req: NextRequest) {
  const qp = req.nextUrl.searchParams.get('symbols') || '';
  const symbols = qp.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean);
  if (!symbols.length) return NextResponse.json({ error: 'symbols required' }, { status: 400 });
  const key = symbols.slice().sort().join(',');
  try {
    const cached = readCache(key);
    if (cached && cached.state === 'fresh') {
      return NextResponse.json({ ok: true, quotes: cached.value, cache: 'HIT' }, { headers: { 'x-cache': 'HIT' } });
    }
    // Attempt FMP batch first
    let batch: unknown;
    try {
      batch = await fmpBatchQuote(symbols, { ttlSeconds: 30, staleSeconds: 120, dedupeKey: `batch:${key}` });
    } catch (e) {
      dwarn('[quotes] fmpBatchQuote failed – will fallback', e);
    }
    const fmpRows: Array<any> = Array.isArray(batch) ? batch as any[] : []; // eslint-disable-line @typescript-eslint/no-explicit-any
    const out: QuoteOut[] = [];
    const got = new Set<string>();
    for (const r of fmpRows) {
      const sym = (r.symbol || r.ticker || '').toString().toUpperCase();
      if (!sym) continue; got.add(sym);
      const pctRaw = (r.changesPercentage ?? r.changePercent ?? r.percent ?? 0).toString();
      const pct = Number(pctRaw.replace(/[()%]/g,''));
      out.push({ symbol: sym, price: Number(r.price ?? 0) || null, change: Number(r.change ?? 0) || null, percent: Number.isFinite(pct)? pct: null, source: 'fmp' });
    }

    // Fallback: for any missing symbol attempt single quote endpoint (our existing /api/market/quote) which uses Yahoo/Alpha
    const missing = symbols.filter(s => !got.has(s));
    if (missing.length) {
      dlog('[quotes] missing after batch, fallback singles:', missing);
      for (const m of missing) {
        try {
          const res = await fetch(`${req.nextUrl.origin}/api/market/quote?symbol=${encodeURIComponent(m)}`, { cache: 'no-store' });
          if (!res.ok) throw new Error(`single quote ${m} ${res.status}`);
          const js = await res.json();
          const q = js.quote || {};
            out.push({ symbol: m, price: Number(q.price ?? 0) || null, change: Number(q.change ?? 0) || null, percent: Number(q.percent ?? 0) || null, source: 'fallback-single' });
        } catch (e) {
          dwarn('[quotes] single fallback failed', m, e);
          out.push({ symbol: m, price: null, change: null, percent: null, source: 'unavailable' });
        }
      }
    }

    // If we had stale cache and new fetch failed entirely, serve stale
    if (!out.length && cached) {
      return NextResponse.json({ ok: true, quotes: cached.value, cache: 'STALE' }, { headers: { 'x-cache': 'STALE' } });
    }
    writeCache(key, out);
    return NextResponse.json({ ok: true, quotes: out, cache: cached ? 'REFRESH' : 'MISS' }, { headers: { 'x-cache': cached? 'REFRESH':'MISS' } });
  } catch (e) {
    derr('[quotes] fatal', e);
    const cached = readCache(key);
    if (cached) {
      return NextResponse.json({ ok: true, quotes: cached.value, cache: 'FALLBACK' }, { headers: { 'x-cache': 'FALLBACK' } });
    }
    return NextResponse.json({ ok: false, error: 'quotes_failed' }, { status: 502 });
  }
}
