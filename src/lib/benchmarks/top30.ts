// Curated list of 30 large-cap, widely-followed U.S. equities (no punctuation tickers for provider compatibility)
export const TOP_30_TICKERS: string[] = [
  "AAPL", "MSFT", "AMZN", "NVDA", "GOOGL", "META", "TSLA", "LLY", "AVGO", "JPM",
  "XOM", "UNH", "V", "JNJ", "WMT", "PG", "MA", "COST", "ORCL", "HD",
  "MRK", "CVX", "ADBE", "KO", "PEP", "TSM", "ASML", "CSCO", "BAC", "NKE"
];

export function getTop30Tickers(): string[] {
  return TOP_30_TICKERS.slice();
}