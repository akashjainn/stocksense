export type IndexRow = { symbol: string; price: number; change: number; changesPercentage: number };
export type ListRow = { symbol: string; name: string; price: number; changePct: number; change: number; volume: number };

const FMP_BASE = "https://financialmodelingprep.com/api/v3";

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

interface FMPQuoteRaw { symbol: string; price?: number; change?: number; changesPercentage?: number | string; }
interface FMPLeaderboardRaw { ticker: string; companyName?: string; price?: number; changesPercentage?: number | string; change?: number; volume?: number; }

export async function fetchMajorIndices(): Promise<Record<string, IndexRow>> {
  const key = getKey();
  if (!key && typeof window !== 'undefined') {
    throw new Error('Missing FMP API key');
  }
  const symbols = ['^GSPC','^IXIC','^DJI'];
  const query = symbols.map(encodeURIComponent).join(',');
  const url = `${FMP_BASE}/quote/${query}?apikey=${key}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    let bodySnippet = '';
    try { bodySnippet = (await res.text()).slice(0,160); } catch {}
    throw new Error(`Failed to fetch indices (${res.status}) ${bodySnippet}`);
  }
  const rows: unknown = await res.json();
  if (!Array.isArray(rows)) return {};
  const clean = (s: FMPQuoteRaw): IndexRow => ({
    symbol: s.symbol,
    price: Number(s.price ?? 0),
    change: Number(s.change ?? 0),
    changesPercentage: Number(String(s.changesPercentage ?? 0).replace(/[()%]/g, "")),
  });
  return Object.fromEntries(rows.map(r => [ (r as FMPQuoteRaw).symbol, clean(r as FMPQuoteRaw) ]));
}

async function fetchLeaderboard(kind: "gainers"|"losers"|"actives"): Promise<ListRow[]> {
  const key = getKey();
  if (!key && typeof window !== 'undefined') {
    throw new Error('Missing FMP API key');
  }
  const url = `${FMP_BASE}/stock/${kind}?apikey=${key}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    let bodySnippet='';
    try { bodySnippet = (await res.text()).slice(0,160); } catch {}
    throw new Error(`Failed to fetch leaderboard ${kind} (${res.status}) ${bodySnippet}`);
  }
  const json: unknown = await res.json();
  if (!Array.isArray(json)) return [];
  return (json as FMPLeaderboardRaw[]).map(r => ({
    symbol: r.ticker,
    name: r.companyName ?? r.ticker,
    price: Number(r.price ?? 0),
    changePct: Number(String(r.changesPercentage ?? 0).replace(/[()%]/g, "")),
    change: Number(r.change ?? 0),
    volume: Number(r.volume ?? 0),
  }));
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
