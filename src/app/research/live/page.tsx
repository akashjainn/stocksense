"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { connectSSE } from "@/lib/market/live";

type LiveQuote = { bid?: number; ask?: number; last?: number; ts?: string; open?: number };

const STORAGE_KEY = "liveQuotes";
const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "SPY"] as const;

export default function LiveMarketsPage() {
  // Use a stable symbols list (doesn't change across renders)
  const symbols = DEFAULT_SYMBOLS as unknown as string[];

  // Initialize state from sessionStorage to avoid blank values on return navigation
  const [data, setData] = useState<Record<string, LiveQuote>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, LiveQuote>;
      const next: Record<string, LiveQuote> = {};
      for (const s of symbols) if (parsed[s]) next[s] = parsed[s];
      return next;
    } catch {
      return {};
    }
  });

  // Persist quotes to sessionStorage on every update
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

  // Open SSE stream for realtime updates and seed with initial snapshots handled by the API
  useEffect(() => {
    const unsub = connectSSE(symbols, (tick) => {
      setData((prev) => ({
        ...prev,
        [tick.symbol]: { ...prev[tick.symbol], bid: tick.bid, ask: tick.ask, last: tick.last, ts: tick.ts },
      }));
    });
    return () => {
      try {
        unsub();
      } catch {}
    };
  }, [symbols]);

  // Fallback: also fetch opening price for change calc once per minute
  useEffect(() => {
    let live = true;
    async function seed() {
      try {
        const res = await fetch(`/api/quotes?symbols=${symbols.join(",")}`, { cache: "no-store" });
        const j = await res.json();
        const arr: Array<{ symbol: string; o?: number; c?: number }> = j?.data || [];
        if (!live) return;
        setData((prev) => {
          const next = { ...prev } as Record<string, LiveQuote>;
          for (const it of arr) {
            next[it.symbol] = { ...(next[it.symbol] || {}), open: it.o, last: next[it.symbol]?.last ?? it.c };
          }
          return next;
        });
      } catch {}
    }
    seed();
    const id = setInterval(seed, 60000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [symbols]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Live Market Data</h1>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {symbols.map((s) => {
          const q = data[s] || {};
          const price = q.last ?? q.bid ?? q.ask;
          const open = q.open;
          const pct = price != null && open ? ((price - open) / open) * 100 : null;
          return (
            <Card key={s} className="rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-medium">{s}</h2>
                  <span className="text-2xl font-semibold">{price != null ? `$${price.toFixed(2)}` : "—"}</span>
                </div>
                <div className="mt-1 text-xs text-neutral-500">{q.bid != null ? `Bid ${q.bid.toFixed(2)}` : "Bid —"} · {q.ask != null ? `Ask ${q.ask.toFixed(2)}` : "Ask —"}</div>
                <div className={`mt-2 text-sm ${pct != null ? (pct >= 0 ? "text-emerald-600" : "text-red-600") : "text-muted-foreground"}`}>
                  {pct != null ? `${pct.toFixed(2)}%` : "No change"}
                </div>
                <div className="mt-4 h-16 w-full bg-muted rounded" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
