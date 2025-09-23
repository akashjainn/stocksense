export type IndexRow = { symbol: string; price: number; change: number; changesPercentage: number };
export type ListRow = { symbol: string; name: string; price: number; changePct: number; change: number; volume: number };

// Refactored to use centralized FMP client (caching + usage tracking)
import { fmpGet, fmpBatchQuote } from '../fmpClient';

interface FMPQuoteRaw { symbol?: string; ticker?: string; price?: number; change?: number; changesPercentage?: number | string; }
interface FMPLeaderboardRaw { symbol?: string; ticker?: string; companyName?: string; name?: string; price?: number; changesPercentage?: number | string; change?: number; volume?: number; }

export async function fetchMajorIndices(): Promise<Record<string, IndexRow>> {
  const wanted = ['^GSPC','^IXIC','^DJI'];
  // Attempt batch quote first with caching (3m fresh)
  let rows: FMPQuoteRaw[] | null = null;
  try {
    const batch = await fmpBatchQuote(wanted, { ttlSeconds: 180, staleSeconds: 600, dedupeKey: 'indices' });
    if (Array.isArray(batch) && batch.length) rows = batch as FMPQuoteRaw[];
  } catch {/* ignore; fallback to singles */}
  if (!rows || rows.length < wanted.length) {
    rows = [];
    for (const sym of wanted) {
      try {
        const single = await fmpGet(`/quote?symbol=${encodeURIComponent(sym)}`, { ttlSeconds: 180, staleSeconds: 600, dedupeKey: `index:${sym}` });
        if (Array.isArray(single) && single[0]) rows.push(single[0]);
      } catch {/* ignore single failure */}
    }
  }

  const clean = (s: FMPQuoteRaw): IndexRow => ({
    symbol: (s.symbol || s.ticker || '').toString(),
    price: Number(s.price ?? 0),
    change: Number(s.change ?? 0),
    changesPercentage: Number(String(s.changesPercentage ?? 0).replace(/[()%]/g, "")),
  });

  const out: Record<string, IndexRow> = {};
  for (const r of (rows || [])) {
    const sym = (r.symbol || r.ticker);
    if (sym && wanted.includes(sym)) out[sym] = clean(r);
  }
  return out;
}

async function fetchLeaderboard(kind: "gainers"|"losers"|"actives"): Promise<ListRow[]> {
  const endpointMap: Record<string,string> = {
    gainers: 'biggest-gainers',
    losers: 'biggest-losers',
    actives: 'most-actives'
  };
  const path = endpointMap[kind];
  const ttl = 300; // 5m fresh
  const stale = 900; // 15m stale
  let json: unknown = [];
  try {
    json = await fmpGet(`/${path}`, { ttlSeconds: ttl, staleSeconds: stale, dedupeKey: `leaderboard:${kind}` });
  } catch {
    // If totally unavailable return empty; stale handling is in client
    return [];
  }
  if (!Array.isArray(json)) return [];
  return (json as FMPLeaderboardRaw[]).map(r => {
  // Volume can appear under different field names; broaden detection
  const anyRow = r as Record<string, unknown>;
  const vol = (anyRow.volume ?? anyRow.volAvg ?? anyRow.avgVolume ?? anyRow.volumeAvg) as number | undefined;
    return {
      symbol: (r.symbol || r.ticker || '').toString(),
      name: (r.companyName || r.name || r.symbol || r.ticker || '').toString(),
      price: Number(r.price ?? 0),
      changePct: Number(String(r.changesPercentage ?? 0).replace(/[()%]/g, "")),
      change: Number(r.change ?? 0),
      volume: Number(vol ?? 0),
    };
  }).filter(r => r.symbol);
}

export async function fetchLeaderboards(): Promise<{ gainers: ListRow[]; losers: ListRow[]; actives: ListRow[] }> {
  const [gainers, losers, actives] = await Promise.all([
    fetchLeaderboard("gainers"),
    fetchLeaderboard("losers"),
    fetchLeaderboard("actives"),
  ]);
  const applyFilter = (rows: ListRow[]) => {
    const filtered = rows.filter(r => r.volume > 200_000).slice(0, 9);
    // If filtering nuked everything (likely due to missing volume data on plan), fallback to top 9 unfiltered.
    return filtered.length ? filtered : rows.slice(0, 9);
  };
  return { gainers: applyFilter(gainers), losers: applyFilter(losers), actives: applyFilter(actives) };
}
