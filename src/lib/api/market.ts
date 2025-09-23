export type IndexRow = { symbol: string; price: number; change: number; changesPercentage: number };
export type ListRow = { symbol: string; name: string; price: number; changePct: number; change: number; volume: number };

// Using new non-legacy FMP "stable" base (replaces legacy /api/v3)
const FMP_BASE = "https://financialmodelingprep.com/stable";

function getKey(): string {
  // Support multiple naming conventions; prefer server-only key if available.
  return (
    process.env.FMP_API_KEY ||
    process.env.FMP_KEY ||
    process.env.VITE_FMP_KEY ||
    process.env.NEXT_PUBLIC_FMP_KEY ||
    ""
  );
}

interface FMPQuoteRaw { symbol?: string; ticker?: string; price?: number; change?: number; changesPercentage?: number | string; }
interface FMPLeaderboardRaw { symbol?: string; ticker?: string; companyName?: string; name?: string; price?: number; changesPercentage?: number | string; change?: number; volume?: number; }

export async function fetchMajorIndices(): Promise<Record<string, IndexRow>> {
  const key = getKey();
  if (!key && typeof window !== 'undefined') {
    throw new Error('Missing FMP API key');
  }
  const wanted = ['^GSPC','^IXIC','^DJI'];

  // Strategy:
  // 1. Try multi-symbol quote query (comma separated) even if undocumented; some FMP stable endpoints still support it.
  // 2. If that fails or returns insufficient rows, fall back to parallel single-symbol requests.
  async function tryBatch(): Promise<FMPQuoteRaw[] | null> {
    const multi = encodeURIComponent(wanted.join(','));
    const url = `${FMP_BASE}/quote?symbol=${multi}&apikey=${key}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    try {
      const json = await res.json();
      return Array.isArray(json) ? json as FMPQuoteRaw[] : null;
    } catch { return null; }
  }

  let rows = await tryBatch();

  if (!rows || rows.length < 3) {
    // Fall back to individual fetches
    rows = [];
    for (const sym of wanted) {
      const url = `${FMP_BASE}/quote?symbol=${encodeURIComponent(sym)}&apikey=${key}`;
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const json = await res.json();
        if (Array.isArray(json) && json[0]) rows.push(json[0]);
      } catch {/* ignore */}
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
  const key = getKey();
  if (!key && typeof window !== 'undefined') {
    throw new Error('Missing FMP API key');
  }
  // Map legacy kinds to new stable endpoints
  const endpointMap: Record<string,string> = {
    gainers: 'biggest-gainers',
    losers: 'biggest-losers',
    actives: 'most-actives'
  };
  const path = endpointMap[kind];
  const url = `${FMP_BASE}/${path}?apikey=${key}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    let bodySnippet='';
    try { bodySnippet = (await res.text()).slice(0,160); } catch {}
    throw new Error(`Failed to fetch leaderboard ${kind} (${res.status}) ${bodySnippet}`);
  }
  const json: unknown = await res.json();
  if (!Array.isArray(json)) return [];
  return (json as FMPLeaderboardRaw[]).map(r => ({
    symbol: (r.symbol || r.ticker || '').toString(),
    name: (r.companyName || r.name || r.symbol || r.ticker || '').toString(),
    price: Number(r.price ?? 0),
    changePct: Number(String(r.changesPercentage ?? 0).replace(/[()%]/g, "")),
    change: Number(r.change ?? 0),
    volume: Number(r.volume ?? 0),
  })).filter(r => r.symbol);
}

export async function fetchLeaderboards(): Promise<{ gainers: ListRow[]; losers: ListRow[]; actives: ListRow[] }> {
  const [gainers, losers, actives] = await Promise.all([
    fetchLeaderboard("gainers"),
    fetchLeaderboard("losers"),
    fetchLeaderboard("actives"),
  ]);
  const filter = (rows: ListRow[]) => rows.filter(r => r.volume > 200_000).slice(0, 9);
  return { gainers: filter(gainers), losers: filter(losers), actives: filter(actives) };
}
