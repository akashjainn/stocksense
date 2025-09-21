"use client";
import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, ExternalLink, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const RANGES = ["1D", "5D", "1M", "3M", "6M", "1Y", "5Y", "MAX"] as const;
type RangeKey = typeof RANGES[number];

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

type OHLC = {
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
};

type Profile = {
  symbol: string;
  name?: string;
  exchange?: string;
  currency?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  pe?: number;
  eps?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  description?: string;
  website?: string;
};

// Utility functions
function formatNumber(n: number | null | undefined, decimals = 2): string {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
}

function formatLargeNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function getPercentColor(percent: number | null): string {
  if (percent == null) return "text-gray-600";
  return percent > 0 ? "text-emerald-600" : percent < 0 ? "text-red-600" : "text-gray-600";
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Fundamental metric card component
const FundamentalCard: React.FC<{ label: string; value?: string; }> = ({ label, value }) => (
  <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
    <div className="font-medium text-gray-900 dark:text-gray-100">{value ?? "—"}</div>
  </div>
);

interface StockDetailProps {
  symbol: string;
}

export default function StockDetail({ symbol }: StockDetailProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [history, setHistory] = useState<OHLC[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedRange, setSelectedRange] = useState<RangeKey>("6M");
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Fetch quote data
  useEffect(() => {
    if (!symbol) return;
    
    const fetchQuote = async () => {
      setLoadingQuote(true);
      try {
        const response = await fetch(`/api/market/quote?symbol=${symbol}`);
        const data = await response.json();
        setQuote(data.quote || null);
      } catch (error) {
        console.error("Failed to fetch quote:", error);
        setQuote(null);
      } finally {
        setLoadingQuote(false);
      }
    };

    fetchQuote();
  }, [symbol]);

  // Fetch profile data
  useEffect(() => {
    if (!symbol) return;
    
    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const response = await fetch(`/api/market/profile?symbol=${symbol}`);
        const data = await response.json();
        setProfile(data);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        setProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [symbol]);

  // Fetch history data
  useEffect(() => {
    if (!symbol) return;
    
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const response = await fetch(`/api/market/history?symbol=${symbol}&range=${selectedRange}`);
        const data = await response.json();
        setHistory(data.series || []);
      } catch (error) {
        console.error("Failed to fetch history:", error);
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [symbol, selectedRange]);

  const isPositive = (quote?.percent ?? 0) >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-6">
      {/* Header Section with Quote */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Company Info & Price */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {loadingProfile ? "Loading..." : `${profile?.name ?? symbol} • ${profile?.exchange ?? ""}`}
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {loadingQuote ? "—" : formatNumber(quote?.price)}
                  </div>
                  {quote && (
                    <div className="flex items-center space-x-3">
                      <div className={cn("flex items-center space-x-1", getPercentColor(quote.percent))}>
                        <TrendIcon className="h-4 w-4" />
                        <span className="font-medium">
                          {quote.change && quote.change >= 0 ? "+" : ""}{formatNumber(quote.change)} 
                          ({formatNumber(quote.percent)}%)
                        </span>
                      </div>
                      <Badge variant={isPositive ? "success" : "destructive"}>
                        {isPositive ? "Up" : "Down"}
                      </Badge>
                    </div>
                  )}
                </div>
                
                {profile?.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Open</div>
                  <div className="font-medium">{formatNumber(quote?.open)}</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Day Range</div>
                  <div className="font-medium">
                    {formatNumber(quote?.low)} - {formatNumber(quote?.high)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Prev Close</div>
                  <div className="font-medium">{formatNumber(quote?.previousClose)}</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Currency</div>
                  <div className="font-medium">{profile?.currency ?? "USD"}</div>
                </div>
              </div>
            </div>

            {/* Range Controls */}
            <div className="lg:ml-6">
              <ToggleGroup
                type="single"
                value={selectedRange}
                onValueChange={(value) => value && setSelectedRange(value as RangeKey)}
                variant="outline"
                size="sm"
                className="flex-wrap"
              >
                {RANGES.map(range => (
                  <ToggleGroupItem key={range} value={range}>
                    {range}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Chart */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Price History</CardTitle>
            {loadingHistory && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading chart...</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  minTickGap={30}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  domain={["dataMin * 0.98", "dataMax * 1.02"]}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  }}
                  formatter={(value: number) => [formatNumber(value), "Price"]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={isPositive ? "#10b981" : "#ef4444"}
                  strokeWidth={2}
                  fill={`url(#gradient-${symbol})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Fundamentals */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <FundamentalCard 
              label="Market Cap" 
              value={formatLargeNumber(profile?.marketCap)} 
            />
            <FundamentalCard 
              label="P/E Ratio" 
              value={profile?.pe ? formatNumber(profile.pe) : undefined} 
            />
            <FundamentalCard 
              label="EPS" 
              value={profile?.eps ? formatNumber(profile.eps) : undefined} 
            />
            <FundamentalCard 
              label="Dividend Yield" 
              value={profile?.dividendYield ? `${formatNumber(profile.dividendYield)}%` : undefined} 
            />
            <FundamentalCard 
              label="52W Range" 
              value={
                profile?.fiftyTwoWeekLow && profile?.fiftyTwoWeekHigh 
                  ? `${formatNumber(profile.fiftyTwoWeekLow)} - ${formatNumber(profile.fiftyTwoWeekHigh)}`
                  : undefined
              } 
            />
            <FundamentalCard 
              label="Sector" 
              value={profile?.sector} 
            />
            <FundamentalCard 
              label="Industry" 
              value={profile?.industry} 
            />
            <FundamentalCard 
              label="Exchange" 
              value={profile?.exchange} 
            />
          </div>

          {/* Company Description */}
          {profile?.description && (
            <div className="mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">About</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {profile.description.length > 300 
                  ? `${profile.description.slice(0, 300)}...` 
                  : profile.description
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}