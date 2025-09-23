export type IndexRow = { symbol: string; price: number; change: number; changesPercentage: number };
export type ListRow = { symbol: string; name: string; price: number; changePct: number; change: number; volume: number };

const FMP_BASE = "https://financialmodelingprep.com/api/v3";

function getKey() {
  // In Next.js you'd use process.env but keeping per instructions (Vite style fallback)
  // @ts-ignore
  return (import.meta?.env?.VITE_FMP_KEY || process.env.VITE_FMP_KEY || process.env.NEXT_PUBLIC_FMP_KEY || "");
}

export async function fetchMajorIndices(): Promise<Record<string, IndexRow>> {
  const key = getKey();
  const url = `${FMP_BASE}/quote/^GSPC,^IXIC,^DJI?apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch indices");
  const rows = await res.json();
  const clean = (s: any): IndexRow => ({
    symbol: s.symbol,
    price: Number(s.price ?? 0),
    change: Number(s.change ?? 0),
    changesPercentage: Number(String(s.changesPercentage ?? 0).replace(/[()%]/g, "")),
  });
  return Object.fromEntries(rows.map((r: any) => [r.symbol, clean(r)]));
}

async function fetchLeaderboard(kind: "gainers"|"losers"|"actives"): Promise<ListRow[]> {
  const key = getKey();
  const url = `${FMP_BASE}/stock/${kind}?apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch leaderboard: "+kind);
  const json = await res.json();
  return json.map((r: any) => ({
    symbol: r.ticker,
    name: r.companyName ?? r.ticker,
    price: Number(r.price ?? 0),
    changePct: Number(String(r.changesPercentage ?? 0).replace(/[()%]/g, "")),
    change: Number(r.change ?? 0),
    volume: Number(r.volume ?? 0),
  }));
}

export async function fetchLeaderboards() {
  const [gainers, losers, actives] = await Promise.all([
    fetchLeaderboard("gainers"),
    fetchLeaderboard("losers"),
    fetchLeaderboard("actives"),
  ]);
  const filter = (rows: ListRow[]) => rows.filter(r => r.volume > 200_000).slice(0, 9);
  return { gainers: filter(gainers), losers: filter(losers), actives: filter(actives) };
}
