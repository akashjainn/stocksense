import { PriceProvider, Quote, Candle } from "./prices";
const API = process.env.ALPHAVANTAGE_API_KEY!;

export class AlphaVantageProvider implements PriceProvider {
  async getQuote(symbols: string[]): Promise<Quote[]> {
    const out: Quote[] = [];
    for (const s of symbols) {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(s)}&apikey=${API}`;
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      const q = (j as any)["Global Quote"];
      if (q) out.push({ symbol: s, price: Number(q["05. price"]) || 0, ts: Date.now() });
    }
    return out;
  }

  async getDailyCandles(symbol: string, startISO: string, endISO: string): Promise<Candle[]> {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&outputsize=full&symbol=${encodeURIComponent(symbol)}&apikey=${API}`;
    const r = await fetch(url, { cache: "no-store" });
    const j = await r.json();
    const ts = (j as any)["Time Series (Daily)"] || {};
    const rows: Candle[] = [];
    const start = new Date(startISO), end = new Date(endISO);
    for (const [date, d] of Object.entries<any>(ts)) {
      const t = new Date(date);
      if (t >= start && t <= end)
        rows.push({
          t: date,
          o: +d["1. open"],
          h: +d["2. high"],
          l: +d["3. low"],
          c: +d["5. adjusted close"],
          v: +d["6. volume"],
        });
    }
    return rows.sort((a, b) => a.t.localeCompare(b.t));
  }
}
