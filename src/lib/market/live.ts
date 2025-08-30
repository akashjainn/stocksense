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
  es.addEventListener('quote', handler as EventListener);
  // Basic error/logging hooks to help with diagnostics
  es.addEventListener('error', ((e: Event) => {
    // DOM Event for error doesn't carry payload in standard EventSource
    console.warn('[SSE] error event', e.type);
  }) as EventListener);
  es.addEventListener('message', handler as EventListener);
  return () => {
    try { es.removeEventListener('quote', handler as EventListener); } catch {}
    try { es.removeEventListener('message', handler as EventListener); } catch {}
    try { es.close(); } catch {}
  };
}
