"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Eye, 
  Plus, 
  TrendingUp, 
  Activity,
  BarChart3,
  RefreshCw,
  X,
  AlertCircle,
  Clock,
  Volume2
} from "lucide-react";

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

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend = 'neutral',
    subtitle
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ComponentType<{ size?: number; className?: string }>; 
    trend?: 'up' | 'down' | 'neutral';
    subtitle?: string;
  }) => (
    <div className="group relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 transition-all duration-300 hover:shadow-medium hover:-translate-y-1">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-soft transition-transform duration-300 group-hover:scale-110 ${
          trend === 'down' ? 'from-red-500 to-red-600' : trend === 'up' ? 'from-emerald-500 to-emerald-600' : 'from-blue-500 to-blue-600'
        }`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>

      <div className="space-y-1 mt-4">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{title}</p>
        <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">{value}</p>
        {subtitle && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>
        )}
      </div>
    </div>
  );

  const totalValue = rows.reduce((sum, row) => sum + (row.c || 0), 0);
  const avgPrice = rows.length > 0 ? totalValue / rows.length : 0;

  return (
    <div className="h-full bg-neutral-50 dark:bg-neutral-950 p-6">
      <div className="max-w-[1400px] mx-auto h-full">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
              Watchlists
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Track and monitor your favorite stocks in real-time
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm text-neutral-600 dark:text-neutral-400">
              {isFetching && <RefreshCw className="w-4 h-4 animate-spin" />}
              {isLoading ? "Loading..." : error ? "Error" : "Live"}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Symbols Tracked" 
              value={symbols.length}
              icon={Eye} 
              trend="neutral"
              subtitle="in watchlist"
            />
            <StatCard 
              title="Average Price" 
              value={avgPrice > 0 ? `$${avgPrice.toFixed(2)}` : "—"}
              icon={BarChart3} 
              trend="neutral"
              subtitle="across holdings"
            />
            <StatCard 
              title="Market Status" 
              value={isFetching ? "Updating" : "Live"}
              icon={Activity} 
              trend={isFetching ? "up" : "neutral"}
              subtitle="data refresh"
            />
            <StatCard 
              title="Total Value" 
              value={totalValue > 0 ? `$${totalValue.toFixed(2)}` : "—"}
              icon={TrendingUp} 
              trend="up"
              subtitle="combined prices"
            />
          </div>

          {/* Add Symbols Section */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                  Add Symbols
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Add stock symbols to track their real-time performance
                </p>
              </div>
              <Plus className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addSymbols();
                  }}
                  placeholder="Add symbols e.g. AAPL, MSFT, GOOGL"
                  className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-3 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
              <button
                onClick={addSymbols}
                className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
              >
                Add
              </button>
            </div>

            {symbols.length > 30 && (
              <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  Showing polling for large lists ({'>'}30 symbols). Live streaming is limited on Basic plans.
                </div>
              </div>
            )}
          </div>

          {/* Watchlist Table */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                  Stock Quotes
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Real-time market data for your tracked symbols
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="pb-3 font-medium">Symbol</th>
                    <th className="pb-3 font-medium text-right">Last Price</th>
                    <th className="pb-3 font-medium text-right">High</th>
                    <th className="pb-3 font-medium text-right">Low</th>
                    <th className="pb-3 font-medium text-right">Volume</th>
                    <th className="pb-3 font-medium text-right">Updated</th>
                    <th className="pb-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {symbols.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-500 dark:text-neutral-400">
                        Add symbols to start tracking market data
                      </td>
                    </tr>
                  )}
                  {symbols.map((sym) => {
                    const row = rows.find((r) => r.symbol === sym);
                    const hasData = !!row;
                    return (
                      <tr key={sym} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                              hasData ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-neutral-100 dark:bg-neutral-800'
                            }`}>
                              <TrendingUp className={`h-5 w-5 ${
                                hasData ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500'
                              }`} />
                            </div>
                            <div>
                              <div className="font-medium text-neutral-900 dark:text-neutral-50">{sym}</div>
                              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                {hasData ? "Live Data" : "Loading..."}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-right font-medium text-neutral-900 dark:text-neutral-50 tabular-nums">
                          {row ? `$${row.c?.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-4 text-right text-neutral-600 dark:text-neutral-400 tabular-nums">
                          {row?.h != null ? `$${row.h.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-4 text-right text-neutral-600 dark:text-neutral-400 tabular-nums">
                          {row?.l != null ? `$${row.l.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-4 text-right text-neutral-600 dark:text-neutral-400 tabular-nums">
                          <div className="flex items-center justify-end gap-1">
                            <Volume2 className="w-3 h-3" />
                            {row?.v != null ? row.v.toLocaleString() : "—"}
                          </div>
                        </td>
                        <td className="py-4 text-right text-neutral-600 dark:text-neutral-400">
                          <div className="flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3" />
                            {row?.asOf ? new Date(row.asOf).toLocaleTimeString() : "—"}
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          <button
                            onClick={() => removeSymbol(sym)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Status Footer */}
            <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center gap-2">
                  {error ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-600 dark:text-red-400">{String((error as Error).message)}</span>
                    </>
                  ) : isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading market data...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4 text-emerald-500" />
                      <span>Last updated {data?.at ? new Date(data.at).toLocaleTimeString() : ""}</span>
                    </>
                  )}
                </div>
                <div>
                  {isFetching && !isLoading && (
                    <span className="text-emerald-600 dark:text-emerald-400">Refreshing...</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
