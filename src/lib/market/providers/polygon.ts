import type { Bar, CorpAction, MarketDataProvider, Quote, Tick } from "../types";
import { Bar, Quote, Tick } from "./types";
import { RawData } from "ws";

// Polygon API shapes
type PolygonAgg = { t: number; o?: number; h?: number; l?: number; c?: number; v?: number };
type AggsResp = { results?: PolygonAgg[] };
type LatestQuoteResults = { t?: number; bp?: number; ap?: number; p?: number; price?: number; last?: { price?: number } };
type LatestQuoteResp = { results?: LatestQuoteResults };
type DividendsResp = { results?: Array<{ payDate?: string; declarationDate?: string; exDividendDate?: string; cashAmount?: number; amount?: number }>} ;
type SplitsResp = { results?: Array<{ executionDate?: string; splitFrom?: number; splitTo?: number }> };
type PolygonWSQuote = {
  ev?: string; // 'Q'
  event?: string; // legacy
  sym?: string;
  symbol?: string;
  t?: number;
  timestamp?: number;
  bp?: number;
  bidPrice?: number;
  ap?: number;
  askPrice?: number;
};

// Minimal fetch wrapper with API key
const BASE = "https://api.polygon.io";
const API_KEY = process.env.POLYGON_API_KEY;

function q(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    usp.set(k, String(v));
  }
  return usp.toString();
}

async function http<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  if (!API_KEY) throw new Error("Missing POLYGON_API_KEY");
  const url = `${BASE}${path}?${q({ ...params, apiKey: API_KEY })}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Polygon HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function toISO(ts: number | string): string {
  return typeof ts === 'number' ? new Date(ts).toISOString() : ts;
}

export class PolygonProvider implements MarketDataProvider {
  async getDailyBars(symbols: string[], from: string, to: string): Promise<Bar[]> {
    const out: Bar[] = [];
    for (const sym of symbols) {
      // Aggregates (1 day) v2
      const data = await http<AggsResp>(`/v2/aggs/ticker/${encodeURIComponent(sym)}/range/1/day/${from}/${to}`, {
        adjusted: "true",
        sort: "asc",
        limit: 50000,
      });
  const results = Array.isArray(data.results) ? data.results : [];
      for (const r of results) {
        out.push({
          t: toISO(r.t),
          o: Number(r.o ?? 0),
          h: Number(r.h ?? 0),
          l: Number(r.l ?? 0),
          c: Number(r.c ?? 0),
          v: r.v,
        });
      }
    }
    return out;
  }

  async getMinuteBars(symbol: string, fromIso: string, toIso: string): Promise<Bar[]> {
    const data = await http<AggsResp>(`/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/minute/${fromIso}/${toIso}`, {
      adjusted: "true",
      sort: "asc",
      limit: 50000,
    });
    const out: Bar[] = [];
    const results = Array.isArray(data.results) ? data.results : [];
    for (const r of results) {
      out.push({
        t: toISO(r.t),
  o: Number(r.o ?? 0),
  h: Number(r.h ?? 0),
  l: Number(r.l ?? 0),
  c: Number(r.c ?? 0),
  v: r.v,
      });
    }
    return out;
  }

  async getQuote(symbol: string): Promise<Quote> {
    // Try v3 latest quotes first
    try {
      const data = await http<LatestQuoteResp>(`/v3/quotes/${encodeURIComponent(symbol)}/latest`, {});
      const q = data?.results;
      return {
        symbol,
        ts: q?.t ? toISO(q.t) : new Date().toISOString(),
        bid: q?.bp,
        ask: q?.ap,
        last: q?.p ?? q?.price ?? q?.last?.price,
      } as Quote;
    } catch {
      // Fallback to v2 NBBO if v3 not available for the plan
      const nbbo = await http<{ results?: { t?: number; p?: number; s?: number; P?: number; S?: number } }>(
        `/v2/last/nbbo/${encodeURIComponent(symbol)}`,
        {}
      );
      const r = nbbo?.results as any;
      return {
        symbol,
        ts: r?.t ? toISO(r.t) : new Date().toISOString(),
        bid: r?.p ?? r?.bp,
        ask: r?.P ?? r?.ap,
        last: undefined,
      } as Quote;
    }
  }

  export const streamQuotes = (
  symbols: string[],
  onMsg: (tick: Tick) => void
): (() => void) => {
  const wsUrl = "wss://socket.polygon.io/stocks";
  let ws: WebSocket | undefined;
  let pollingInterval: NodeJS.Timeout | undefined;
  let unsubscribed = false;

  const POLLING_INTERVAL = 5000; // 5 seconds

  const startPolling = () => {
    // Don't start polling if we've already unsubscribed or are already polling
    if (unsubscribed || pollingInterval) {
      return;
    }

    console.log(
      `[Polygon Fallback] WebSocket failed. Starting REST polling every ${POLLING_INTERVAL}ms.`
    );

    const poll = async () => {
      console.log("[Polygon Fallback] Polling for quotes...");
      for (const symbol of symbols) {
        try {
          const quote = await getQuote(symbol);
          if (quote && !unsubscribed) {
            onMsg(quote);
          }
        } catch (error) {
          console.error(
            `[Polygon Fallback] Error fetching quote for ${symbol}:`,
            error
          );
        }
      }
    };

    // Poll immediately and then set interval
    poll();
    pollingInterval = setInterval(poll, POLLING_INTERVAL);
  };

  const connectWs = async () => {
    if (unsubscribed) return;

    try {
      const WebSocket = (await import("ws")).default;
      ws = new WebSocket(wsUrl);

      ws.on("open", () => {
        console.log("[Polygon WS] ==> Connection open");
        const apiKey = process.env.POLYGON_API_KEY;
        if (!apiKey) {
          console.error("[Polygon WS] Error: POLYGON_API_KEY not set");
          ws?.close();
          startPolling(); // Fallback if key is missing
          return;
        }
        const authMsg = JSON.stringify({ action: "auth", params: apiKey });
        console.log(`[Polygon WS] ==> AUTH ${authMsg}`);
        ws?.send(authMsg);
      });

      ws.on("message", (data: RawData) => {
        const messages = JSON.parse(data.toString());
        console.log(`[Polygon WS] <== ${JSON.stringify(messages)}`);

        messages.forEach((msg: any) => {
          if (msg.ev === "status") {
            if (msg.status === "auth_failed") {
              console.error(`[Polygon WS] Auth failed: ${msg.message}`);
              ws?.close();
              // The 'close' event will trigger startPolling
            } else if (msg.status === "connected") {
              // On successful connection, subscribe
              const subMsg = JSON.stringify({
                action: "subscribe",
                params: `Q.${symbols.join(",Q.")},AM.${symbols.join(",AM.")}`,
              });
              console.log(`[Polygon WS] ==> SUB ${subMsg}`);
              ws?.send(subMsg);
            }
          } else if (msg.ev === "Q" && msg.p && msg.s) {
            onMsg({
              provider: "polygon",
              symbol: msg.s,
              price: msg.p,
              timestamp: msg.t,
            });
          } else if (msg.ev === "AM" && msg.c && msg.s) {
            onMsg({
              provider: "polygon",
              symbol: msg.s,
              price: msg.c,
              timestamp: msg.t,
            });
          }
        });
      });

      ws.on("error", (error) => {
        console.error("[Polygon WS] Error:", error);
        // The 'close' event will be fired subsequently, which will trigger polling
      });

      ws.on("close", (code) => {
        console.log(`[Polygon WS] Close: ${code}`);
        // If the close was unexpected, start polling
        if (!unsubscribed) {
          startPolling();
        }
      });
    } catch (e) {
      console.error("[Polygon WS] Failed to initialize WebSocket:", e);
      startPolling();
    }
  };

  connectWs();

  return () => {
    console.log("[Polygon Stream] Unsubscribing...");
    unsubscribed = true;
    if (ws) {
      // Cleanly close the websocket connection
      ws.close(1000, "Unsubscribed by client");
      ws = undefined;
    }
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = undefined;
    }
  };
};

  async getCorporateActions(symbols: string[]): Promise<CorpAction[]> {
    const out: CorpAction[] = [];
    for (const sym of symbols) {
      // Dividends
      const div = await http<DividendsResp>(`/v3/reference/dividends`, { ticker: sym, limit: 100 });
      const dres = Array.isArray(div.results) ? div.results : [];
      for (const d of dres) {
        const date = d.payDate ?? d.declarationDate ?? d.exDividendDate ?? new Date().toISOString();
        out.push({ symbol: sym, type: 'DIVIDEND', date, dividend: Number(d.cashAmount ?? d.amount ?? 0), exDate: d.exDividendDate });
      }
      // Splits
      const spl = await http<SplitsResp>(`/v3/reference/splits`, { ticker: sym, limit: 100 });
      const sres = Array.isArray(spl.results) ? spl.results : [];
      for (const s of sres) {
        const ratio = s.splitFrom && s.splitTo ? Number(s.splitFrom) / Number(s.splitTo) : undefined;
        const date = s.executionDate ?? new Date().toISOString();
        out.push({ symbol: sym, type: 'SPLIT', date, splitRatio: ratio, exDate: s.executionDate });
      }
    }
    return out;
  }
}
