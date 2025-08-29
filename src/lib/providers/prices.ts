import { AlphaVantageProvider } from "./alphaVantage";
export type Quote = { symbol: string; price: number; ts: number };
export type Candle = { t: string; o?: number; h?: number; l?: number; c: number; v?: number };

export interface PriceProvider {
  getQuote(symbols: string[]): Promise<Quote[]>;
  getDailyCandles(symbol: string, startISO: string, endISO: string): Promise<Candle[]>;
}

export const buildProvider = (): PriceProvider => new AlphaVantageProvider();
