"use client";
import { useEffect, useState } from "react";
import { connectSSE } from "@/lib/market/live";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

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

  const [refreshing, setRefreshing] = useState(false);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  const QuoteCard = ({ symbol }: { symbol: string }) => {
    const q = data[symbol] || {};
    const price = q.last ?? q.bid ?? q.ask;
    const open = q.open;
    const pct = price != null && open ? ((price - open) / open) * 100 : null;
    const isPositive = pct != null && pct >= 0;
    
    return (
      <div className="group relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 transition-all duration-300 hover:shadow-medium hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-soft transition-transform duration-300 group-hover:scale-110 ${
              isPositive ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'
            }`}>
              <Activity className="h-6 w-6 text-white" />
            </div>
            
            {pct != null && (
              <div className={`flex items-center space-x-1 text-sm font-medium ${
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {isPositive ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                <span>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</span>
              </div>
            )}
          </div>

          <div className="space-y-1 mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{symbol}</h2>
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
              {price != null ? `$${price.toFixed(2)}` : "—"}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600 dark:text-neutral-400">Bid</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-50">
                {q.bid != null ? `$${q.bid.toFixed(2)}` : "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600 dark:text-neutral-400">Ask</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-50">
                {q.ask != null ? `$${q.ask.toFixed(2)}` : "—"}
              </span>
            </div>
          </div>

          {pct != null && (
            <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <div className={`text-sm font-medium ${
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {pct >= 0 ? '+' : ''}{pct.toFixed(2)}% today
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-neutral-50 dark:bg-neutral-950 p-6">
      <div className="max-w-[1400px] mx-auto h-full">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
              Live Market Data
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Real-time quotes and market data streamed live
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Live Stream</span>
            </div>
            <button 
              onClick={handleRefresh} 
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-all ${
                refreshing ? 'opacity-70' : ''
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Live Quotes Grid */}
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-6">
              Featured Stocks
            </h2>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
              {symbols.map((symbol) => (
                <QuoteCard key={symbol} symbol={symbol} />
              ))}
            </div>
          </div>

          {/* Market Status */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                  Market Status
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Current trading session information
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Market Open</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">Market Hours</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">9:30 AM - 4:00 PM</p>
                <p className="text-xs text-neutral-500">EST</p>
              </div>
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">Pre-Market</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">4:00 AM - 9:30 AM</p>
                <p className="text-xs text-neutral-500">EST</p>
              </div>
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">After Hours</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">4:00 PM - 8:00 PM</p>
                <p className="text-xs text-neutral-500">EST</p>
              </div>
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">Time Zone</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">EST</p>
                <p className="text-xs text-neutral-500">UTC-5</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
