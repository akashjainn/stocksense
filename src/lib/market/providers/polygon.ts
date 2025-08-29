import type { Bar, CorpAction, MarketDataProvider, Quote, Tick } from "../types";

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
    const data = await http<LatestQuoteResp>(`/v3/quotes/${encodeURIComponent(symbol)}/latest`, {});
    const q = data?.results;
    return {
      symbol,
      ts: q?.t ? toISO(q.t) : new Date().toISOString(),
      bid: q?.bp,
      ask: q?.ap,
      last: q?.p ?? q?.price ?? q?.last?.price,
    } as Quote;
  }

  async streamQuotes(symbols: string[], onMsg: (msg: Tick) => void): Promise<() => void> {
    // Polygon WebSocket: wss://socket.polygon.io/stocks
    if (!API_KEY) throw new Error("Missing POLYGON_API_KEY");
  const url = "wss://socket.polygon.io/stocks";
    const WS = ((globalThis as unknown as { WebSocket?: typeof WebSocket }).WebSocket) ?? WebSocket;
    const ws = new WS(url);

    const subs = symbols.map((s) => `Q.${s}`);

    const handleMessage = (ev: MessageEvent<string>) => {
      try {
        const parsed: unknown = JSON.parse(ev.data);
        if (!Array.isArray(parsed)) return;
        for (const m of parsed as Array<Record<string, unknown>>) {
          const mm = m as PolygonWSQuote;
          const evType = mm.ev ?? mm.event;
          if (evType === 'Q') {
            onMsg({
              symbol: mm.sym ?? mm.symbol ?? "",
              ts: toISO(mm.t ?? mm.timestamp ?? Date.now()),
              bid: mm.bp ?? mm.bidPrice,
              ask: mm.ap ?? mm.askPrice,
              last: undefined,
            });
          }
        }
      } catch {}
    };

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ action: 'auth', params: API_KEY }));
      ws.send(JSON.stringify({ action: 'subscribe', params: subs.join(',') }));
    });
  ws.addEventListener('message', handleMessage);

    const unsubscribe = () => {
      try {
  ws.removeEventListener('message', handleMessage);
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ action: 'unsubscribe', params: subs.join(',') }));
          ws.close(1000, 'client-unsubscribe');
        }
      } catch {}
    };

    return Promise.resolve(unsubscribe);
  }

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
