import Alpaca from "@alpacahq/alpaca-trade-api";
import type { Bar, Quote, Tick, CorpAction } from "../types";

// Minimal shape emitted by Alpaca data_stream_v2 for stock quote events
type AlpacaWsQuoteEvent = {
  Symbol: string;
  Timestamp: string | number | Date;
  BidPrice?: number;
  AskPrice?: number;
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
    console.error(`Error fetching quote for ${symbol} from Alpaca:`, error);
    // Surface a consistent error up the stack
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
    stream.subscribeForQuotes(symbols);
    console.log(`[Alpaca WS] ==> SUB Quotes: ${symbols.join(", ")}`);
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

  stream.onDisconnect(() => {
    console.log("[Alpaca WS] Disconnected");
  });

  stream.connect();

  return () => {
    console.log("[Alpaca Stream] Unsubscribing...");
    stream.unsubscribeFromQuotes(symbols);
    stream.disconnect();
  };
};
