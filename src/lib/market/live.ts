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
  es.addEventListener('error', ((e: MessageEvent) => {
    try {
      const d = (e as any).data ? JSON.parse((e as any).data) : null;
      console.warn('[SSE] error', d ?? e);
    } catch { console.warn('[SSE] error'); }
  }) as EventListener);
  es.addEventListener('message', handler as EventListener);
  return () => {
    try { es.removeEventListener('quote', handler as EventListener); } catch {}
    try { es.removeEventListener('message', handler as EventListener); } catch {}
    try { es.close(); } catch {}
  };
}
