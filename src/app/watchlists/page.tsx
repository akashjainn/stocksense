"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

type QuoteRow = { symbol: string; o?: number; h?: number; l?: number; c: number; v?: number; asOf: string };

export default function WatchlistsPage() {
  const [input, setInput] = useState("");
  const [symbols, setSymbols] = useState<string[]>([]);

  // load/save to localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("watchlistSymbols");
      if (raw) setSymbols(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("watchlistSymbols", JSON.stringify(symbols));
    } catch {}
  }, [symbols]);

  const addSymbols = useCallback(() => {
    const parts = input
      .split(/[,\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (!parts.length) return;
    setSymbols((prev) => Array.from(new Set([...prev, ...parts])));
    setInput("");
  }, [input]);

  const removeSymbol = useCallback((sym: string) => {
    setSymbols((prev) => prev.filter((s) => s !== sym));
  }, []);

  const queryKey = useMemo(() => ["quotes", symbols.join(",")], [symbols]);
  const { data, isLoading, isFetching, error } = useQuery<{ data: QuoteRow[]; at: number } | null>({
    queryKey,
    queryFn: async () => {
      if (!symbols.length) return { data: [], at: Date.now() };
      const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to fetch quotes: ${res.status}`);
      return res.json();
    },
    refetchInterval: symbols.length ? 30000 : false,
  });

  const rows: QuoteRow[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Watchlist</h1>

      <div className="flex gap-2 items-center">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addSymbols();
          }}
          placeholder="Add symbols e.g. AAPL, MSFT"
          className="flex-1 md:w-96 px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
        />
        <button
          onClick={addSymbols}
          className="px-3 py-2 rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
        >
          Add
        </button>
      </div>

    {symbols.length > 30 && (
        <div className="text-sm text-amber-600 dark:text-amber-400">
      Showing polling for large lists ({'>'}30 symbols). Live streaming is limited on Basic plans.
        </div>
      )}

      <div className="overflow-auto">
        <table className="min-w-[640px] w-full text-sm">
          <thead>
            <tr className="text-neutral-500">
              <th className="text-left p-2">Symbol</th>
              <th className="text-right p-2">Last</th>
              <th className="text-right p-2">High</th>
              <th className="text-right p-2">Low</th>
              <th className="text-right p-2">Volume</th>
              <th className="text-right p-2">As of</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {symbols.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-neutral-500">
                  Add symbols to start tracking.
                </td>
              </tr>
            )}
            {symbols.map((sym) => {
              const row = rows.find((r) => r.symbol === sym);
              return (
                <tr key={sym} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="p-2 font-medium">{sym}</td>
                  <td className="p-2 text-right tabular-nums">{row ? row.c?.toFixed(2) : "—"}</td>
                  <td className="p-2 text-right tabular-nums">{row?.h != null ? row.h.toFixed(2) : "—"}</td>
                  <td className="p-2 text-right tabular-nums">{row?.l != null ? row.l.toFixed(2) : "—"}</td>
                  <td className="p-2 text-right tabular-nums">{row?.v != null ? row.v.toLocaleString() : "—"}</td>
                  <td className="p-2 text-right">{row?.asOf ? new Date(row.asOf).toLocaleTimeString() : "—"}</td>
                  <td className="p-2 text-right">
                    <button
                      onClick={() => removeSymbol(sym)}
                      className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-neutral-500">
        {error ? (
          <span className="text-red-600">{String((error as Error).message)}</span>
        ) : isLoading ? (
          "Loading…"
        ) : (
          <>Updated {isFetching ? "(refreshing) " : ""}{data?.at ? new Date(data.at).toLocaleTimeString() : ""}</>
        )}
      </div>
    </div>
  );
}
