// Lightweight client-side helpers to standardize portfolio data fetching
export type EquityPoint = { t: string; v: number };
export type PositionDTO = {
  symbol: string;
  qty: number;
  cost: number;
  price?: number;
  value?: number;
  pnl?: number;
  pnlPct?: number;
  baselineCostMarket?: number;
  pnlMarket?: number;
};

export async function ensureAccount(): Promise<{ id: string; name: string }> {
  const resp = await fetch("/api/accounts");
  if (!resp.ok) throw new Error(`Failed to load accounts (${resp.status})`);
  const j = await resp.json();
  const list = (j?.data as Array<{ id: string; name: string }>) || [];
  if (list.length > 0) return list[0];
  const cr = await fetch("/api/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "My Portfolio" }),
  });
  if (!cr.ok) throw new Error(`Failed to create account (${cr.status})`);
  const cj = await cr.json();
  if (!cj?.data?.id) throw new Error("Failed to create a valid account");
  return cj.data as { id: string; name: string };
}

export async function getPortfolio(accountId: string): Promise<{
  cash: number;
  totalCost: number;
  totalValue: number;
  positions: PositionDTO[];
  equityCurve: EquityPoint[];
  totals?: { baselineCostMarket?: number; pnlMarket?: number };
}> {
  // Add a small cache-buster to avoid stale CDN-cached responses right after import
  const res = await fetch(`/api/portfolio?accountId=${encodeURIComponent(accountId)}&_=${Date.now()}`);
  if (!res.ok) throw new Error(`Failed to load portfolio (${res.status})`);
  return res.json();
}

export async function getPortfolioHistory(accountId: string, period: string) {
  const res = await fetch(`/api/portfolio/history?accountId=${encodeURIComponent(accountId)}&period=${encodeURIComponent(period)}`);
  if (!res.ok) throw new Error(`Failed to load portfolio history (${res.status})`);
  return res.json();
}
