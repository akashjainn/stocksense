import Alpaca from "@alpacahq/alpaca-trade-api";
import type { Bar, Quote, Tick, CorpAction } from "../types";

// Minimal shape emitted by Alpaca data_stream_v2 for stock quote events
type AlpacaWsQuoteEvent = {
  Symbol: string;
  Timestamp: string | number | Date;
  BidPrice?: number;
  AskPrice?: number;
};

// Minimal snapshot shape used in fallbacks
type AlpacaSnapshot = {
  LatestTrade?: { Price?: number; Size?: number; Timestamp?: number | string | Date };
  LatestQuote?: { BidPrice?: number; AskPrice?: number; Timestamp?: number | string | Date };
  MinuteBar?: { Timestamp?: number | string | Date; OpenPrice?: number; HighPrice?: number; LowPrice?: number; ClosePrice?: number; Volume?: number };
  DailyBar?: { Timestamp?: number | string | Date; OpenPrice?: number; HighPrice?: number; LowPrice?: number; ClosePrice?: number; Volume?: number };
};

let alpaca: Alpaca;
function getAlpacaInstance() {
  if (!alpaca) {
    // Support both ALPACA_* and APCA_* env var names
    const keyId =
      process.env.ALPACA_API_KEY_ID || process.env.APCA_API_KEY_ID;
    const secretKey =
      process.env.ALPACA_API_SECRET_KEY || process.env.APCA_API_SECRET_KEY;

    if (!keyId || !secretKey) {
      throw new Error(
        "Alpaca API Key ID and Secret Key must be set in environment variables."
      );
    }

    alpaca = new Alpaca({
      keyId: keyId,
      secretKey: secretKey,
      // default to paper unless explicitly set to 'false'
      paper: (process.env.ALPACA_PAPER ?? process.env.APCA_PAPER ?? 'true') !== 'false',
    });
  }
  return alpaca;
}

export async function getDailyBars(
  symbols: string[],
  fromIso: string,
  toIso: string
): Promise<Bar[]> {
  const alpaca = getAlpacaInstance();
  const result: Bar[] = [];
  for (const symbol of symbols) {
    const bars = alpaca.getBarsV2(symbol, {
      start: fromIso,
      end: toIso,
      timeframe: "1Day",
    });
    for await (const bar of bars) {
      result.push({
        t: new Date(bar.Timestamp).toISOString(),
        o: bar.OpenPrice,
        h: bar.HighPrice,
        l: bar.LowPrice,
        c: bar.ClosePrice,
        v: bar.Volume,
      });
    }
  }
  return result;
}

export async function getMinuteBars(
  symbol: string,
  fromIso: string,
  toIso: string
): Promise<Bar[]> {
  const alpaca = getAlpacaInstance();
  const bars = alpaca.getBarsV2(symbol, {
    start: fromIso,
    end: toIso,
    timeframe: "1Min",
  });
  const result: Bar[] = [];
  for await (const bar of bars) {
    result.push({
      t: new Date(bar.Timestamp).toISOString(),
      o: bar.OpenPrice,
      h: bar.HighPrice,
      l: bar.LowPrice,
      c: bar.ClosePrice,
      v: bar.Volume,
    });
  }
  return result;
}

export async function getQuote(symbol: string): Promise<Quote> {
  const alpaca = getAlpacaInstance();
  try {
    const quote = await alpaca.getLatestQuote(symbol);
    return {
      symbol: quote.Symbol,
      ts: new Date(quote.Timestamp).toISOString(),
      bid: quote.BidPrice,
      ask: quote.AskPrice,
    };
  } catch (error) {
    console.warn(`Primary latestQuote failed for ${symbol}, attempting snapshot fallback...`, error);
    // Fallback: try snapshots API to populate a quote-like result
    try {
      const res = (await alpaca.getSnapshots([symbol])) as
        | Map<string, AlpacaSnapshot>
        | Record<string, AlpacaSnapshot>
        | AlpacaSnapshot[];
      let entry: AlpacaSnapshot | undefined;
      if (res instanceof Map) {
        entry = res.get(symbol);
      } else if (Array.isArray(res)) {
        entry = res[0];
      } else {
        entry = (res as Record<string, AlpacaSnapshot>)[symbol];
      }
      if (entry) {
        const ts = entry?.LatestQuote?.Timestamp ?? entry?.LatestTrade?.Timestamp ?? entry?.MinuteBar?.Timestamp ?? Date.now();
        const bid = entry?.LatestQuote?.BidPrice;
        const ask = entry?.LatestQuote?.AskPrice;
        const last = entry?.LatestTrade?.Price;
        return {
          symbol,
          ts: new Date(ts).toISOString(),
          bid,
          ask,
          last,
        };
      }
    } catch (e) {
      console.error(`Snapshot fallback also failed for ${symbol}`, e);
    }
    // Surface a consistent error up the stack if all fallbacks fail
    throw error;
  }
}

export async function getCorporateActions(
  symbols: string[]
): Promise<CorpAction[]> {
  console.warn(
    `getCorporateActions is not implemented for Alpaca provider for symbols ${symbols.join(",")}`
  );
  return Promise.resolve([]);
}

export const streamQuotes = async (
  symbols: string[],
  onMsg: (tick: Tick) => void
): Promise<() => void> => {
  const alpaca = getAlpacaInstance();
  const stream = alpaca.data_stream_v2;

  stream.onConnect(() => {
    console.log("[Alpaca WS] ==> Connection open");
    // Subscribe to both quotes (bid/ask) and trades (last) for richer updates
    try {
      type HasSubscribe = { subscribe: (args: { quotes?: string[]; trades?: string[] }) => void };
      if (typeof (stream as unknown as HasSubscribe).subscribe === 'function') {
        (stream as unknown as HasSubscribe).subscribe({ quotes: symbols, trades: symbols });
      } else {
        stream.subscribeForQuotes(symbols);
        type HasTradeSubscribe = { subscribeForTrades: (syms: string[]) => void };
        if (typeof (stream as unknown as HasTradeSubscribe).subscribeForTrades === 'function') {
          (stream as unknown as HasTradeSubscribe).subscribeForTrades(symbols);
        }
      }
    } catch (e) {
      console.warn("[Alpaca WS] subscribe failed, falling back to quotes only", e);
      stream.subscribeForQuotes(symbols);
    }
    console.log(`[Alpaca WS] ==> SUB Quotes/Trades: ${symbols.join(", ")}`);
  });

  stream.onError((err: Error) => {
    console.error("[Alpaca WS] Error:", err);
  });

  stream.onStockQuote((quote: AlpacaWsQuoteEvent) => {
    console.log(`[Alpaca WS] <== Quote: ${quote.Symbol}`);
    onMsg({
      symbol: quote.Symbol,
      ts: new Date(quote.Timestamp).toISOString(),
      bid: quote.BidPrice,
      ask: quote.AskPrice,
    });
  });

  // Also propagate last price updates via trade events when available
  (stream as unknown as { onStockTrade?: (cb: (t: { Symbol: string; Price: number; Timestamp: string | number | Date }) => void) => void }).onStockTrade?.((trade) => {
    try {
      onMsg({
        symbol: trade.Symbol,
        ts: new Date(trade.Timestamp).toISOString(),
        last: trade.Price,
      });
    } catch {}
  });

  stream.onDisconnect(() => {
    console.log("[Alpaca WS] Disconnected");
  });

  stream.connect();

  return () => {
    console.log("[Alpaca Stream] Unsubscribing...");
    try {
      type HasUnsubscribe = { unsubscribe: (args: { quotes?: string[]; trades?: string[] }) => void };
      if (typeof (stream as unknown as HasUnsubscribe).unsubscribe === 'function') {
        (stream as unknown as HasUnsubscribe).unsubscribe({ quotes: symbols, trades: symbols });
      } else {
        stream.unsubscribeFromQuotes(symbols);
        (stream as unknown as { unsubscribeFromTrades?: (syms: string[]) => void }).unsubscribeFromTrades?.(symbols);
      }
    } catch {}
    stream.disconnect();
  };
};
