export type Bar = {
  t: string; // ISO timestamp
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
};

export type Quote = {
  symbol: string;
  ts: string; // ISO timestamp
  bid?: number;
  ask?: number;
  last?: number;
};

export type Tick = Quote;

export type CorpAction = {
  symbol: string;
  type: 'SPLIT' | 'DIVIDEND' | 'OTHER';
  date: string; // ISO
  splitRatio?: number; // e.g., 2 for 2-for-1
  dividend?: number; // cash amount per share
  exDate?: string; // ISO
};

export interface MarketDataProvider {
  getDailyBars(symbols: string[], from: string, to: string): Promise<Bar[]>;
  getMinuteBars(symbol: string, fromIso: string, toIso: string): Promise<Bar[]>;
  getQuote(symbol: string): Promise<Quote>;
  streamQuotes(symbols: string[], onMsg: (msg: Tick) => void): Promise<() => void>; // unsubscribe
  getCorporateActions(symbols: string[]): Promise<CorpAction[]>;
}
