export const parseNum = (v: unknown) => Number(String(v ?? 0).replace(/,/g, ""));
export const formatUSD = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export function computePortfolioTotals(positions: Array<{ price?: number|string; shares?: number|string; prevClose?: number|string; costBasis?: number|string; }>) {
  let marketValue = 0, dayChange = 0, totalGainLoss = 0;
  for (const p of positions ?? []) {
    const price = parseNum(p.price), shares = parseNum(p.shares);
    const prev = parseNum(p.prevClose), cost = parseNum(p.costBasis);
    const value = shares * price;
    marketValue += value;
    if (prev > 0) dayChange += shares * (price - prev);
    if (cost > 0) totalGainLoss += value - cost;
  }
  return { marketValue, dayChange, totalGainLoss };
}
