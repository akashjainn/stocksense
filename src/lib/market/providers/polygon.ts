import type { Bar, CorpAction, MarketDataProvider, Quote, Tick } from "../types";

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
      const data = await http<any>(`/v2/aggs/ticker/${encodeURIComponent(sym)}/range/1/day/${from}/${to}`, {
        adjusted: "true",
        sort: "asc",
        limit: 50000,
      });
      const results = Array.isArray(data.results) ? data.results : [];
      for (const r of results) {
        out.push({
          t: toISO(r.t),
          o: Number(r.o ?? r.open ?? 0),
          h: Number(r.h ?? r.high ?? 0),
          l: Number(r.l ?? r.low ?? 0),
          c: Number(r.c ?? r.close ?? 0),
          v: r.v ?? r.volume,
        });
      }
    }
    return out;
  }

  async getMinuteBars(symbol: string, fromIso: string, toIso: string): Promise<Bar[]> {
    const data = await http<any>(`/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/minute/${fromIso}/${toIso}`, {
      adjusted: "true",
      sort: "asc",
      limit: 50000,
    });
    const out: Bar[] = [];
    const results = Array.isArray(data.results) ? data.results : [];
    for (const r of results) {
      out.push({
        t: toISO(r.t),
        o: Number(r.o ?? r.open ?? 0),
        h: Number(r.h ?? r.high ?? 0),
        l: Number(r.l ?? r.low ?? 0),
        c: Number(r.c ?? r.close ?? 0),
        v: r.v ?? r.volume,
      });
    }
    return out;
  }

  async getQuote(symbol: string): Promise<Quote> {
    const data = await http<any>(`/v3/quotes/${encodeURIComponent(symbol)}/latest`, {});
    const q = data?.results ?? data; // v3 returns {results: {...}}
    return {
      symbol,
      ts: q.t ? toISO(q.t) : new Date().toISOString(),
      bid: q.bp ?? q.bidPrice,
      ask: q.ap ?? q.askPrice,
      last: q.p ?? q.price ?? q.last?.price,
    } as Quote;
  }

  async streamQuotes(symbols: string[], onMsg: (msg: Tick) => void): Promise<() => void> {
    // Polygon WebSocket: wss://socket.polygon.io/stocks
    if (!API_KEY) throw new Error("Missing POLYGON_API_KEY");
    const url = "wss://socket.polygon.io/stocks";
    const ws = new (globalThis as any).WebSocket(url);

    const subs = symbols.map((s) => `Q.${s}`);

    const handleMessage = (ev: MessageEvent) => {
      try {
        const arr = JSON.parse((ev as any).data as string);
        for (const m of arr) {
          if (m.ev === 'Q' || m.event === 'Q') {
            onMsg({
              symbol: m.sym ?? m.symbol,
              ts: toISO(m.t ?? m.timestamp ?? Date.now()),
              bid: m.bp ?? m.bidPrice,
              ask: m.ap ?? m.askPrice,
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
    ws.addEventListener('message', handleMessage as any);

    const unsubscribe = () => {
      try {
        ws.removeEventListener('message', handleMessage as any);
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
      const div = await http<any>(`/v3/reference/dividends`, { ticker: sym, limit: 100 });
      const dres = Array.isArray(div.results) ? div.results : [];
      for (const d of dres) {
        out.push({ symbol: sym, type: 'DIVIDEND', date: d.payDate ?? d.declarationDate ?? d.exDividendDate, dividend: Number(d.cashAmount ?? d.amount ?? 0), exDate: d.exDividendDate });
      }
      // Splits
      const spl = await http<any>(`/v3/reference/splits`, { ticker: sym, limit: 100 });
      const sres = Array.isArray(spl.results) ? spl.results : [];
      for (const s of sres) {
        const ratio = s.splitFrom && s.splitTo ? Number(s.splitFrom) / Number(s.splitTo) : undefined;
        out.push({ symbol: sym, type: 'SPLIT', date: s.executionDate, splitRatio: ratio, exDate: s.executionDate });
      }
    }
    return out;
  }
}
