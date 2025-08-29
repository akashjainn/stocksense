import Alpaca from "@alpacahq/alpaca-trade-api";
import { withBackoff } from "@/lib/http/rateLimit";

// ENV: APCA_API_KEY_ID, APCA_API_SECRET_KEY
function client() {
  const keyId = process.env.APCA_API_KEY_ID || process.env.ALPACA_API_KEY_ID;
  const secretKey = process.env.APCA_API_SECRET_KEY || process.env.ALPACA_API_SECRET_KEY;
  if (!keyId || !secretKey) throw new Error("Missing APCA_API_KEY_ID/APCA_API_SECRET_KEY envs");
  return new Alpaca({ keyId, secretKey, paper: true });
}

export type LatestBar = {
  symbol: string;
  t: string; o: number; h: number; l: number; c: number; v?: number;
};

export async function getLatestBars(symbols: string[]): Promise<LatestBar[]> {
  const c = client();
  const res = await withBackoff(() => c.getLatestBars(symbols));
  // SDK returns a Map<string, Bar>
  const out: LatestBar[] = [];
  for (const [sym, bar] of res) {
    out.push({ symbol: sym, t: new Date(bar.Timestamp).toISOString(), o: bar.OpenPrice, h: bar.HighPrice, l: bar.LowPrice, c: bar.ClosePrice, v: bar.Volume });
  }
  return out;
}

export type GetBarsInput = {
  symbols: string[] | string;
  start: string; // ISO
  end: string;   // ISO
  timeframe: "1Min" | "5Min" | "15Min" | "1Hour" | "1Day";
};

export async function getBars(input: GetBarsInput) {
  const c = client();
  const symbols = Array.isArray(input.symbols) ? input.symbols : [input.symbols];
  const out: Record<string, LatestBar[]> = {};
  for (const s of symbols) {
    const bars = c.getBarsV2(s, { start: input.start, end: input.end, timeframe: input.timeframe });
    const arr: LatestBar[] = [];
    for await (const bar of bars) {
      arr.push({ symbol: s, t: new Date(bar.Timestamp).toISOString(), o: bar.OpenPrice, h: bar.HighPrice, l: bar.LowPrice, c: bar.ClosePrice, v: bar.Volume });
    }
    out[s] = arr;
  }
  return out;
}

export type Snapshot = {
  symbol: string;
  latestTrade?: { p: number; s: number; t: string };
  latestQuote?: { bp?: number; ap?: number; t: string };
  minuteBar?: LatestBar;
  dailyBar?: LatestBar;
};

export async function getSnapshots(symbols: string[]): Promise<Snapshot[]> {
  const c = client();
  const res = await withBackoff(() => c.getSnapshots(symbols));
  const out: Snapshot[] = [];
  // Minimal shape for snapshots returned by SDK
  type AlpacaSnapshot = {
    LatestTrade?: { Price: number; Size: number; Timestamp: number | string | Date };
    LatestQuote?: { BidPrice?: number; AskPrice?: number; Timestamp: number | string | Date };
    MinuteBar?: { Timestamp: number | string | Date; OpenPrice: number; HighPrice: number; LowPrice: number; ClosePrice: number; Volume?: number };
    DailyBar?: { Timestamp: number | string | Date; OpenPrice: number; HighPrice: number; LowPrice: number; ClosePrice: number; Volume?: number };
  };
  const entries: Array<[string, AlpacaSnapshot]> =
    res instanceof Map
      ? Array.from((res as Map<string, AlpacaSnapshot>).entries())
      : Object.entries(Object(res)).filter(([k]) => typeof k === "string") as Array<[string, AlpacaSnapshot]>;
  for (const [key, snap] of entries) {
    const sym = String(key);
    out.push({
      symbol: sym,
      latestTrade: snap?.LatestTrade ? { p: snap.LatestTrade.Price, s: snap.LatestTrade.Size, t: new Date(snap.LatestTrade.Timestamp).toISOString() } : undefined,
      latestQuote: snap?.LatestQuote ? { bp: snap.LatestQuote.BidPrice, ap: snap.LatestQuote.AskPrice, t: new Date(snap.LatestQuote.Timestamp).toISOString() } : undefined,
      minuteBar: snap?.MinuteBar ? { symbol: sym, t: new Date(snap.MinuteBar.Timestamp).toISOString(), o: snap.MinuteBar.OpenPrice, h: snap.MinuteBar.HighPrice, l: snap.MinuteBar.LowPrice, c: snap.MinuteBar.ClosePrice, v: snap.MinuteBar.Volume } : undefined,
      dailyBar: snap?.DailyBar ? { symbol: sym, t: new Date(snap.DailyBar.Timestamp).toISOString(), o: snap.DailyBar.OpenPrice, h: snap.DailyBar.HighPrice, l: snap.DailyBar.LowPrice, c: snap.DailyBar.ClosePrice, v: snap.DailyBar.Volume } : undefined,
    });
  }
  return out;
}

export type StreamHandlers = {
  onTrade?: (t: { symbol: string; p: number; s: number; ts: string }) => void;
  onQuote?: (q: { symbol: string; bp?: number; ap?: number; ts: string }) => void;
  onBar?: (b: LatestBar) => void;
};

export async function openStream({ symbols, onTrade, onQuote, onBar }: { symbols: string[] } & StreamHandlers) {
  const c = client();
  const stream = c.data_stream_v2;
  stream.onConnect(() => {
    stream.subscribe({ quotes: symbols, trades: symbols, bars: symbols });
  });
  type WsTrade = { Symbol: string; Price: number; Size: number; Timestamp: number | string | Date };
  type WsQuote = { Symbol: string; BidPrice?: number; AskPrice?: number; Timestamp: number | string | Date };
  type WsBar = { Symbol: string; Timestamp: number | string | Date; OpenPrice: number; HighPrice: number; LowPrice: number; ClosePrice: number; Volume?: number };
  if (onTrade) stream.onStockTrade((t: WsTrade) => onTrade({ symbol: t.Symbol, p: t.Price, s: t.Size, ts: new Date(t.Timestamp).toISOString() }));
  if (onQuote) stream.onStockQuote((q: WsQuote) => onQuote({ symbol: q.Symbol, bp: q.BidPrice, ap: q.AskPrice, ts: new Date(q.Timestamp).toISOString() }));
  if (onBar) stream.onStockBar((b: WsBar) => onBar({ symbol: b.Symbol, t: new Date(b.Timestamp).toISOString(), o: b.OpenPrice, h: b.HighPrice, l: b.LowPrice, c: b.ClosePrice, v: b.Volume }));
  stream.connect();
  return () => {
    stream.unsubscribe({ quotes: symbols, trades: symbols, bars: symbols });
    stream.disconnect();
  };
}
