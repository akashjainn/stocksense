import Alpaca from "@alpacahq/alpaca-trade-api";
import type { Bar, Quote, Tick, CorpAction } from "../types";

// WS event shape we rely on
type AlpacaWsQuoteEvent = {
  Symbol: string;
  Timestamp: string | number | Date;
  BidPrice?: number;
  AskPrice?: number;
};

// Snapshot shape for fallback
type AlpacaSnapshot = {
  LatestTrade?: { Price?: number; Size?: number; Timestamp?: number | string | Date };
  LatestQuote?: { BidPrice?: number; AskPrice?: number; Timestamp?: number | string | Date };
  MinuteBar?: { Timestamp?: number | string | Date; OpenPrice?: number; HighPrice?: number; LowPrice?: number; ClosePrice?: number; Volume?: number };
  DailyBar?: { Timestamp?: number | string | Date; OpenPrice?: number; HighPrice?: number; LowPrice?: number; ClosePrice?: number; Volume?: number };
};

let client: Alpaca | null = null;
function getClient() {
  if (!client) {
    const keyId = process.env.ALPACA_API_KEY_ID || process.env.APCA_API_KEY_ID;
    const secretKey = process.env.ALPACA_API_SECRET_KEY || process.env.APCA_API_SECRET_KEY;
    if (!keyId || !secretKey) throw new Error("Alpaca API Key ID/Secret missing in env");
    client = new Alpaca({ keyId, secretKey, paper: (process.env.ALPACA_PAPER ?? process.env.APCA_PAPER ?? "true") !== "false" });
  }
  return client;
}

export async function getDailyBars(symbols: string[], fromIso: string, toIso: string): Promise<Bar[]> {
  const c = getClient();
  const out: Bar[] = [];
  for (const s of symbols) {
    const bars = c.getBarsV2(s, { start: fromIso, end: toIso, timeframe: "1Day" });
    for await (const bar of bars) {
      out.push({ t: new Date(bar.Timestamp).toISOString(), o: bar.OpenPrice, h: bar.HighPrice, l: bar.LowPrice, c: bar.ClosePrice, v: bar.Volume });
    }
  }
  return out;
}

export async function getMinuteBars(symbol: string, fromIso: string, toIso: string): Promise<Bar[]> {
  const c = getClient();
  const bars = c.getBarsV2(symbol, { start: fromIso, end: toIso, timeframe: "1Min" });
  const out: Bar[] = [];
  for await (const bar of bars) {
    out.push({ t: new Date(bar.Timestamp).toISOString(), o: bar.OpenPrice, h: bar.HighPrice, l: bar.LowPrice, c: bar.ClosePrice, v: bar.Volume });
  }
  return out;
}

export async function getQuote(symbol: string): Promise<Quote> {
  const c = getClient();
  try {
    const q = await c.getLatestQuote(symbol);
    return { symbol: q.Symbol, ts: new Date(q.Timestamp).toISOString(), bid: q.BidPrice, ask: q.AskPrice };
  } catch (error) {
    try {
      const res = (await c.getSnapshots([symbol])) as Map<string, AlpacaSnapshot> | Record<string, AlpacaSnapshot> | AlpacaSnapshot[];
      let entry: AlpacaSnapshot | undefined;
      if (res instanceof Map) entry = res.get(symbol);
      else if (Array.isArray(res)) entry = res[0];
      else entry = (res as Record<string, AlpacaSnapshot>)[symbol];
      if (entry) {
        const ts = entry?.LatestQuote?.Timestamp ?? entry?.LatestTrade?.Timestamp ?? entry?.MinuteBar?.Timestamp ?? Date.now();
        return { symbol, ts: new Date(ts).toISOString(), bid: entry?.LatestQuote?.BidPrice, ask: entry?.LatestQuote?.AskPrice, last: entry?.LatestTrade?.Price };
      }
    } catch {}
    throw error;
  }
}

export async function getCorporateActions(symbols: string[]): Promise<CorpAction[]> {
  console.warn(`getCorporateActions not implemented for: ${symbols.join(",")}`);
  return [];
}

export const streamQuotes = async (symbols: string[], onMsg: (msg: Tick) => void): Promise<() => void> => {
  const c = getClient();
  const stream = c.data_stream_v2;

  stream.onConnect(() => {
    try {
      type HasSubscribe = { subscribe: (args: { quotes?: string[]; trades?: string[] }) => void };
      if (typeof (stream as unknown as HasSubscribe).subscribe === "function") {
        (stream as unknown as HasSubscribe).subscribe({ quotes: symbols, trades: symbols });
      } else {
        stream.subscribeForQuotes(symbols);
        type HasTradeSubscribe = { subscribeForTrades: (syms: string[]) => void };
        if (typeof (stream as unknown as HasTradeSubscribe).subscribeForTrades === "function") {
          (stream as unknown as HasTradeSubscribe).subscribeForTrades(symbols);
        }
      }
    } catch {
      stream.subscribeForQuotes(symbols);
    }
  });

  stream.onError((err: Error) => {
    console.error("[Alpaca WS] Error:", err);
  });

  stream.onStockQuote((q: AlpacaWsQuoteEvent) => {
    onMsg({ symbol: q.Symbol, ts: new Date(q.Timestamp).toISOString(), bid: q.BidPrice, ask: q.AskPrice });
  });

  (stream as unknown as { onStockTrade?: (cb: (t: { Symbol: string; Price: number; Timestamp: string | number | Date }) => void) => void }).onStockTrade?.((t) => {
    try { onMsg({ symbol: t.Symbol, ts: new Date(t.Timestamp).toISOString(), last: t.Price }); } catch {}
  });

  stream.connect();

  return () => {
    try {
      type HasUnsubscribe = { unsubscribe: (args: { quotes?: string[]; trades?: string[] }) => void };
      if (typeof (stream as unknown as HasUnsubscribe).unsubscribe === "function") {
        (stream as unknown as HasUnsubscribe).unsubscribe({ quotes: symbols, trades: symbols });
      } else {
        stream.unsubscribeFromQuotes(symbols);
        (stream as unknown as { unsubscribeFromTrades?: (syms: string[]) => void }).unsubscribeFromTrades?.(symbols);
      }
    } catch {}
    stream.disconnect();
  };
};
