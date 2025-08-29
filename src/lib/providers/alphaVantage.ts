import { PriceProvider, Quote, Candle } from "./prices";
const API = process.env.ALPHAVANTAGE_API_KEY!;

export class AlphaVantageProvider implements PriceProvider {
  async getQuote(symbols: string[]): Promise<Quote[]> {
    const out: Quote[] = [];
    for (const s of symbols) {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(s)}&apikey=${API}`;
      const r = await fetch(url, { cache: "no-store" });
  const j: { [key: string]: unknown } = await r.json();
  const q = j["Global Quote"] as { [key: string]: string } | undefined;
      if (q) out.push({ symbol: s, price: Number(q["05. price"]) || 0, ts: Date.now() });
    }
    return out;
  }

  async getDailyCandles(symbol: string, startISO: string, endISO: string): Promise<Candle[]> {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&outputsize=full&symbol=${encodeURIComponent(symbol)}&apikey=${API}`;
  const r = await fetch(url, { cache: "no-store" });
  const j: { [key: string]: unknown } = await r.json();
  const ts = (j["Time Series (Daily)"] as Record<string, Record<string, string>> | undefined) || {};
    const rows: Candle[] = [];
    const start = new Date(startISO), end = new Date(endISO);
  for (const [date, d] of Object.entries(ts)) {
      const t = new Date(date);
      if (t >= start && t <= end)
        rows.push({
          t: date,
      o: Number(d["1. open"]),
      h: Number(d["2. high"]),
      l: Number(d["3. low"]),
      c: Number(d["5. adjusted close"]),
      v: Number(d["6. volume"]),
        });
    }
    return rows.sort((a, b) => a.t.localeCompare(b.t));
  }
}
