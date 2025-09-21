"use client";
import React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Plus, Star, X } from "lucide-react";
import Link from "next/link";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Search Components
import SearchAutocomplete from "@/components/SearchAutocomplete";
import StockDetail from "@/components/StockDetail";

// Types
type Quote = {
  symbol: string;
  price: number | null;
  change: number | null;
  percent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
};

type HistoryPoint = { date: string; close: number; open?: number; high?: number; low?: number };

// Constants
const INDEXES = [
  { label: "S&P 500", symbol: "^GSPC", description: "500 largest US companies" },
  { label: "Nasdaq 100", symbol: "^NDX", description: "100 largest non-financial companies" },
  { label: "Dow Jones", symbol: "^DJI", description: "30 blue-chip companies" },
];

const POPULAR_TICKERS = ["AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA", "NFLX", "AMD", "AVGO"];

// Utility Functions
function formatNumber(n: number | null): string {
  if (n === null) return "—";
  return n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n.toFixed(2);
}

function formatPercent(n: number | null): string {
  if (n === null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Enhanced Market KPI Card Component
const MarketKPICard: React.FC<{ index: typeof INDEXES[0] }> = ({ index }) => {
  const [quote, setQuote] = React.useState<Quote | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    const fetchQuote = async () => {
      try {
        const response = await fetch(`/api/market/quote?symbol=${encodeURIComponent(index.symbol)}`, { cache: "no-store" });
        const data = await response.json();
        if (!mounted) return;
        setQuote(data.quote || null);
      } catch (error) {
        console.error(`Failed to fetch quote for ${index.symbol}:`, error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    fetchQuote();
    return () => { mounted = false; };
  }, [index.symbol]);

  const isPositive = (quote?.percent ?? 0) >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  if (loading) {
    return (
      <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{index.label}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{index.description}</p>
          </div>
          <TrendIcon className={cn("h-5 w-5", isPositive ? "text-emerald-500" : "text-red-500")} />
        </div>
        
        <div className="space-y-1">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatNumber(quote?.price ?? null)}
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={isPositive ? "success" : "destructive"} className="text-xs">
              {formatPercent(quote?.percent ?? null)}
            </Badge>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {quote?.change !== null && quote?.change !== undefined ? `${quote.change >= 0 ? "+" : ""}${formatNumber(quote.change)}` : "—"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Watchlist Component
const WatchlistCard: React.FC<{ symbol: string; onRemove: () => void }> = ({ symbol, onRemove }) => {
  const [quote, setQuote] = React.useState<Quote | null>(null);
  const [sparklineData, setSparklineData] = React.useState<HistoryPoint[]>([]);

  React.useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [quoteRes, histRes] = await Promise.all([
          fetch(`/api/market/quote?symbol=${symbol}`),
          fetch(`/api/market/history?symbol=${symbol}&range=1M`)
        ]);
        
        const [quoteData, histData] = await Promise.all([quoteRes.json(), histRes.json()]);
        
        if (!mounted) return;
        setQuote(quoteData.quote);
        setSparklineData(histData.series?.slice(-30) || []);
      } catch (error) {
        console.error(`Failed to fetch data for ${symbol}:`, error);
      }
    };
    
    fetchData();
    return () => { mounted = false; };
  }, [symbol]);

  const isPositive = (quote?.percent ?? 0) >= 0;

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900 dark:text-gray-100">{symbol}</span>
          <button onClick={onRemove} className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/20 rounded border-0 bg-transparent">
            <X className="h-3 w-3 text-red-500" />
          </button>
        </div>
        <div className="flex items-center space-x-2 mt-1">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {formatNumber(quote?.price ?? null)}
          </span>
          <span className={cn("text-xs font-medium", isPositive ? "text-emerald-600" : "text-red-600")}>
            {formatPercent(quote?.percent ?? null)}
          </span>
        </div>
      </div>
      <div className="w-16 h-8 ml-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparklineData}>
            <Line 
              type="monotone" 
              dataKey="close" 
              stroke={isPositive ? "#10b981" : "#ef4444"} 
              strokeWidth={1.5} 
              dot={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Main Market Page Component
export default function MarketPage() {
  const [activeSymbol, setActiveSymbol] = React.useState("AAPL");
  const [watchlist, setWatchlist] = React.useState<string[]>(["AAPL", "MSFT", "NVDA"]);
  const [activeTab, setActiveTab] = React.useState("search");

  const addToWatchlist = () => {
    if (activeSymbol && !watchlist.includes(activeSymbol)) {
      setWatchlist(prev => [...prev, activeSymbol]);
    }
  };

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist(prev => prev.filter(s => s !== symbol));
  };

  const selectPopularStock = (symbol: string) => {
    setActiveSymbol(symbol);
    setActiveTab("search"); // Switch to search tab when selecting a stock
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Market Overview</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Real-time market data and comprehensive stock analysis</p>
            </div>
            <Link href="/research" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              Back to Research →
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab("search")}
                  className={`${
                    activeTab === "search"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  Stock Search & Analysis
                </button>
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`${
                    activeTab === "overview"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  Market Overview
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "search" && (
            <div className="space-y-8">
              {/* Search Section */}
              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 max-w-2xl">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Search Stocks
                      </label>
                      <SearchAutocomplete
                        onSelect={setActiveSymbol}
                        placeholder="Search by symbol (AAPL) or company name (Apple)"
                        className="w-full"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <button 
                            onClick={addToWatchlist}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add to Watchlist</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Add {activeSymbol} to your watchlist</TooltipContent>
                      </UITooltip>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stock Detail */}
              <StockDetail symbol={activeSymbol} />

              {/* Popular Stocks Quick Select */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle>Popular Stocks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {POPULAR_TICKERS.map(ticker => (
                      <button
                        key={ticker}
                        onClick={() => selectPopularStock(ticker)}
                        className={cn(
                          "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          activeSymbol === ticker 
                            ? "bg-blue-600 text-white" 
                            : "border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        {ticker}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Market Indices KPI Cards */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Major Indices</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {INDEXES.map(index => (
                    <MarketKPICard key={index.symbol} index={index} />
                  ))}
                </div>
              </section>

              {/* Watchlist Sidebar */}
              <section>
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <span>Watchlist</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {watchlist.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No symbols in watchlist
                      </p>
                    ) : (
                      watchlist.map(symbol => (
                        <WatchlistCard
                          key={symbol}
                          symbol={symbol}
                          onRemove={() => removeFromWatchlist(symbol)}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>
              </section>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
