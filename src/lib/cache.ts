// Lightweight in-memory + optional Redis assisted cache for API route layer
// Provides: get/set with TTL, stale fallback, and lastGood snapshot semantics.

import { getRedis } from './redis';

export interface CacheOptions<T> {
  key: string;
  ttlMs: number;            // freshness window
  staleMs?: number;         // additional stale serve window
  fetcher: () => Promise<T>;
  allowNull?: boolean;      // if false and fetch returns null/undefined, keep old
}

interface Entry { value: unknown; exp: number; staleExp: number; }
const mem = new Map<string, Entry>();

async function readRedis(key: string): Promise<Entry | null> {
  if (!process.env.REDIS_URL) return null;
  try { const r = getRedis(); const raw = await r.get(key); return raw ? JSON.parse(raw) as Entry : null; } catch { return null; }
}
async function writeRedis(key: string, entry: Entry, ttl: number) {
  if (!process.env.REDIS_URL) return; try { const r = getRedis(); await r.set(key, JSON.stringify(entry), 'PX', ttl); } catch {/* ignore */}
}

export async function cached<T>(opts: CacheOptions<T>): Promise<{ value: T; source: 'fresh'|'memory'|'redis'|'stale'; }> {
  const now = Date.now();
  const staleMs = opts.staleMs ?? opts.ttlMs * 2;
  const redisKey = `routecache:${opts.key}`;

  const entry = mem.get(opts.key);
  if (entry) {
    if (entry.exp > now) return { value: entry.value as T, source: 'memory' };
    if (entry.staleExp > now) {
      // Trigger background refresh but return stale immediately
      void refresh();
      return { value: entry.value as T, source: 'stale' };
    }
  } else if (process.env.REDIS_URL) {
    const red = await readRedis(redisKey);
    if (red) {
      mem.set(opts.key, red);
      if (red.exp > now) return { value: red.value as T, source: 'redis' };
      if (red.staleExp > now) { void refresh(); return { value: red.value as T, source: 'stale' }; }
    }
  }

  return refresh();

  async function refresh(): Promise<{ value: T; source: 'fresh' }> {
    const value = await opts.fetcher();
    if ((value === null || value === undefined) && !opts.allowNull && entry) {
      return { value: entry.value as T, source: 'fresh' }; // keep old if fetch produced null and not allowed
    }
    const newEntry: Entry = { value, exp: now + opts.ttlMs, staleExp: now + opts.ttlMs + staleMs };
    mem.set(opts.key, newEntry);
    writeRedis(redisKey, newEntry, opts.ttlMs + staleMs).catch(()=>{});
    return { value, source: 'fresh' };
  }
}

// Helper for lastGood semantics when upstream fails entirely.
export function lastGoodWrap<T>(fn: () => Promise<T>, holder: { current?: { value: T; ts: number } }): Promise<T> {
  return fn().then(v => { holder.current = { value: v, ts: Date.now() }; return v; }).catch(e => {
    if (holder.current) return holder.current.value; throw e;
  });
}
