// Lightweight Yahoo Finance helpers to mirror your Google Sheets macros server-side
// We keep parsing simple and return flattened values similar to your output formatter.

export type ModuleRequest = Record<string, string[]>;

const YAHOO_HEADERS: HeadersInit = {
  "User-Agent": "stocksense",
  "Accept": "application/json, text/plain, */*",
};

function extractVal(obj: unknown): string | number | null {
  if (obj == null) return null;
  if (typeof obj === "object") {
    const rec = obj as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(rec, "raw")) {
      const raw = (rec as { raw?: unknown }).raw;
      if (typeof raw === "number" || typeof raw === "string") return raw;
      return raw == null ? null : JSON.stringify(raw);
    }
    const s = JSON.stringify(rec);
    return s === "{}" ? null : s;
  }
  if (typeof obj === "number" || typeof obj === "string") return obj;
  return null;
}

function getModule(payload: Record<string, unknown>, name: string): Record<string, unknown> | undefined {
  const v = payload[name];
  if (v && typeof v === "object") return v as Record<string, unknown>;
  return undefined;
}

export async function fetchYahooQuoteSummary(ticker: string, modules: ModuleRequest) {
  const moduleList = Object.keys(modules).join(",");
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${encodeURIComponent(moduleList)}`;

  const res = await fetch(url, { headers: YAHOO_HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`Yahoo quoteSummary failed (${res.status})`);
  const json = await res.json();
  const payload = (json?.quoteSummary?.result?.[0] ?? {}) as Record<string, unknown>;

  const headers: string[] = [];
  const values: (string | number | null)[] = [];

  for (const mod of Object.keys(modules)) {
    const wants = modules[mod] || [];
    const modObj = getModule(payload, mod);

    if (wants.length === 0 && modObj) {
      for (const [key, val] of Object.entries(modObj)) {
        headers.push(key);
        values.push(extractVal(val));
      }
    } else if (wants.length > 0 && modObj) {
      for (const key of wants) {
        headers.push(key);
        values.push(extractVal(modObj[key]));
      }
    } else {
      for (const key of wants) {
        headers.push(key);
        values.push(null);
      }
    }
  }

  return { headers, values };
}

export async function fetchYahooStockL1(ticker: string) {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=price,summaryDetail`;
  const res = await fetch(url, { headers: YAHOO_HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`Yahoo stock failed (${res.status})`);
  const data = await res.json();
  const price = data?.quoteSummary?.result?.[0]?.price;
  const sd = data?.quoteSummary?.result?.[0]?.summaryDetail;
  const marketPrice = price?.regularMarketPrice?.raw ?? null;
  const bid = sd?.bid?.raw ?? null;
  const ask = sd?.ask?.raw ?? null;
  const change = price?.regularMarketChange?.raw ?? null;
  return [[marketPrice, bid, ask, change]] as const;
}

export async function fetchYahooOptionMid(ticker: string) {
  const url = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(ticker)}`;
  const res = await fetch(url, { headers: YAHOO_HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`Yahoo options failed (${res.status})`);
  const data = await res.json();
  const quote = data?.optionChain?.result?.[0]?.quote ?? {};
  const bid = typeof quote.bid === "number" ? quote.bid : null;
  const ask = typeof quote.ask === "number" ? quote.ask : null;
  const prevClose = typeof quote.regularMarketPreviousClose === "number" ? quote.regularMarketPreviousClose : null;
  const strike = typeof quote.strike === "number" ? quote.strike : null;
  const mid = bid != null && ask != null ? (bid + ask) / 2 : null;
  const change = mid != null && prevClose != null ? mid - prevClose : null;
  return [[mid, bid, ask, change, strike]] as const;
}

// Fetch daily candles via Yahoo Chart API between two ISO dates (inclusive)
// Returns minimal candle objects matching internal Candle shape.
export async function fetchYahooDailyCandles(symbol: string, fromISO: string, toISO: string) {
  const period1 = Math.floor(new Date(fromISO + 'T00:00:00Z').getTime() / 1000);
  const period2 = Math.floor(new Date(toISO + 'T23:59:59Z').getTime() / 1000);
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false&events=div%2Csplits`;
  const res = await fetch(url, { headers: YAHOO_HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`Yahoo chart failed (${res.status})`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return [];
  const timestamps: number[] = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const closes: Array<number | null> = quote.close || [];
  const opens: Array<number | null> = quote.open || [];
  const highs: Array<number | null> = quote.high || [];
  const lows: Array<number | null> = quote.low || [];
  const volumes: Array<number | null> = quote.volume || [];
  const out: Array<{ t: string; o?: number; h?: number; l?: number; c: number; v?: number }> = [];
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const d = new Date(ts * 1000).toISOString().slice(0, 10);
    const c = closes[i];
    if (c == null || !Number.isFinite(c)) continue; // skip missing
    out.push({
      t: d,
      c,
      o: opens[i] ?? undefined,
      h: highs[i] ?? undefined,
      l: lows[i] ?? undefined,
      v: volumes[i] ?? undefined,
    });
  }
  return out;
}
