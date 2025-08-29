import type { Tick } from "./types";

export function connectSSE(symbols: string[], onQuote: (tick: Tick) => void) {
  const url = `/api/stream?symbols=${encodeURIComponent(symbols.join(','))}`;
  const es = new EventSource(url);
  const handler = (ev: MessageEvent) => {
    try {
      const data = JSON.parse(ev.data) as Tick;
      onQuote(data);
    } catch {}
  };
  es.addEventListener('quote', handler as any);
  return () => {
    try { es.removeEventListener('quote', handler as any); } catch {}
    try { es.close(); } catch {}
  };
}
