// Centralized lightweight FMP client with in-memory (and optional Redis) caching
// Goals:
// - Minimize upstream calls (250/day plan constraint)
// - Provide per-path TTL caching + request de-duplication
// - Track daily usage count
// - Serve stale cache on upstream failure (stale-while-error)
//
// NOTE: This is intentionally simple; if Redis is unavailable it still works in-memory.

import { getRedis } from './redis';

const FMP_BASE = 'https://financialmodelingprep.com/stable';

function getApiKey(): string {
  return (
    process.env.FMP_API_KEY ||
    process.env.FMP_KEY ||
    process.env.VITE_FMP_KEY ||
    process.env.NEXT_PUBLIC_FMP_KEY ||
    ''
  );
}

// In-memory cache map
// Generic cache entry; we store unknown and cast at call boundaries
interface CacheEntry { expiresAt: number; json: unknown; staleUntil: number; pending?: Promise<unknown>; }
const memoryCache = new Map<string, CacheEntry>();

// Usage tracking (in-memory + optional Redis)
const usageKeyForToday = () => {
  const d = new Date();
  return `fmp:usage:${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
};

async function incrUsage(): Promise<number> {
  try {
    if (process.env.REDIS_URL) {
      const r = getRedis();
      // Expire key at next UTC midnight
      const key = usageKeyForToday();
      const val = await r.incr(key);
      const ttl = await r.ttl(key);
      if (ttl < 0) {
        const now = new Date();
        const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1, 0,0,5));
        await r.expire(key, Math.ceil((reset.getTime()-now.getTime())/1000));
      }
      return val;
    }
  } catch {/* ignore redis issues */}
  // Fallback in-memory counter
  const k = usageKeyForToday();
  const existing = (global as any).__fmpUsage || {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  const next = (existing[k] || 0) + 1;
  existing[k] = next;
  (global as any).__fmpUsage = existing; // eslint-disable-line @typescript-eslint/no-explicit-any
  return next;
}

export async function getUsage(): Promise<{ used: number; remaining: number; limit: number; resetUTC: string }> {
  const limit = Number(process.env.FMP_DAILY_LIMIT || 250);
  const key = usageKeyForToday();
  let used = 0;
  try {
    if (process.env.REDIS_URL) {
      const r = getRedis();
      const raw = await r.get(key);
      used = raw ? Number(raw) : 0;
    } else {
      const store = (global as any).__fmpUsage || {}; // eslint-disable-line @typescript-eslint/no-explicit-any
      used = store[key] || 0;
    }
  } catch { used = 0; }
  const now = new Date();
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1, 0,0,0));
  return { used, remaining: Math.max(0, limit - used), limit, resetUTC: reset.toISOString() };
}

export interface FmpFetchOptions {
  ttlSeconds?: number;          // Fresh cache lifetime
  staleSeconds?: number;        // Additional lifetime where stale can serve on error
  tag?: string;                 // Optional tag for debugging
  dedupeKey?: string;           // Force multiple different paths to share one underlying call
  budgetGroup?: string;         // For future budget partitioning (not yet enforced)
}

function cacheKey(path: string, key: string, dedupe?: string) {
  return `fmp:${dedupe || path}:key:${key}`;
}

async function readRedis(k: string): Promise<CacheEntry | null> {
  if (!process.env.REDIS_URL) return null;
  try {
    const r = getRedis();
    const raw = await r.get(k);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch { return null; }
}

async function writeRedis(k: string, entry: CacheEntry, ttlSec: number) {
  if (!process.env.REDIS_URL) return;
  try {
    const r = getRedis();
    await r.set(k, JSON.stringify(entry), 'EX', Math.max(1, ttlSec));
  } catch {/* ignore */}
}

export async function fmpGet<T = unknown>(path: string, opts: FmpFetchOptions = {}): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Missing FMP API key');
  const ttl = opts.ttlSeconds ?? 180; // default 3m
  const stale = opts.staleSeconds ?? ttl * 2; // default stale window = 2x ttl
  const fullPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${FMP_BASE}${fullPath}${fullPath.includes('?') ? '&' : '?'}apikey=${apiKey}`;
  const k = cacheKey(fullPath, apiKey, opts.dedupeKey);

  // 1. Memory lookup
  const now = Date.now();
  const mem = memoryCache.get(k);
  if (mem) {
  if (mem.expiresAt > now) return mem.json as T; // Fresh
  if (mem.pending) return mem.pending as Promise<T>;      // In-flight refresh
    // Eligible stale if within stale window
  }

  // 2. Redis lookup (if not in memory or memory stale)
  if (!mem && process.env.REDIS_URL) {
    const red = await readRedis(k);
    if (red) {
      memoryCache.set(k, red); // hydrate
  if (red.expiresAt > now) return red.json as T;
    }
  }

  // If we have stale data and still within stale window, we'll serve it on error
  const staleData: T | undefined = mem && mem.staleUntil > now ? (mem.json as T) : undefined;

  // De-duplication: if another call already started after stale detection
  if (mem && mem.pending) return mem.pending as Promise<T>;

  const fetchPromise = (async () => {
    try {
      const usedBefore = await getUsage(); // read (not counting yet)
      // Hard limit guard (soft failover to stale)
      if (usedBefore.remaining <= 0 && staleData !== undefined) {
        return staleData; // Out of budget; serve stale
      }
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`FMP ${fullPath} ${res.status}`);
      const json = await res.json();
      await incrUsage(); // Count actual upstream call
      const entry: CacheEntry = {
        expiresAt: Date.now() + ttl * 1000,
        staleUntil: Date.now() + (ttl + stale) * 1000,
        json
      };
      memoryCache.set(k, entry);
      // Persist only fresh window in Redis to avoid long stale bloat
      writeRedis(k, entry, ttl + stale).catch(()=>{});
  return json as T;
    } catch (e) {
  if (staleData !== undefined) return staleData;
      throw e;
    } finally {
      const entry = memoryCache.get(k);
      if (entry) delete entry.pending; // clear pending marker
    }
  })();

  memoryCache.set(k, {
    expiresAt: mem?.expiresAt ?? 0,
    staleUntil: mem?.staleUntil ?? (Date.now() + stale * 1000),
    json: mem?.json,
    pending: fetchPromise
  });

  return fetchPromise as Promise<T>;
}

// Convenience helpers for specific patterns
export async function fmpBatchQuote(symbols: string[], opts: FmpFetchOptions = {}) {
  const unique = Array.from(new Set(symbols.filter(Boolean)));
  if (unique.length === 0) return [] as unknown[];
  const encoded = encodeURIComponent(unique.join(','));
  return fmpGet(`/quote?symbol=${encoded}`, { ttlSeconds: 180, ...opts });
}
