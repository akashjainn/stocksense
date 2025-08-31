"use client";
import { useEffect, useMemo, useState } from "react";
import { PortfolioChart } from "@/components/metrics/portfolio-chart";
import { ensureAccount, getPortfolio, type EquityPoint } from "@/lib/client/portfolio";
import { 
  Briefcase, 
  TrendingUp, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Download,
  RefreshCw
} from "lucide-react";

type Pt = EquityPoint;

export default function PortfolioPage() {
  const [series, setSeries] = useState<Pt[]>([]);
  const [range, setRange] = useState<"30D" | "3M" | "1Y" | "3Y">("30D");
  const [refreshing, setRefreshing] = useState(false);
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [totalValue, setTotalValue] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [cash, setCash] = useState(0);
  const [positionsCount, setPositionsCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        const acct = await ensureAccount();
        setAccountId(acct.id);
        await loadPortfolio(acct.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to initialize portfolio");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  async function loadPortfolio(id?: string) {
    const acct = id ?? accountId;
    if (!acct) return;
    const data = await getPortfolio(acct);
    setSeries(data.equityCurve || []);
    setTotalValue(Number(data.totalValue || 0));
    setTotalCost(Number(data.totalCost || 0));
    setCash(Number(data.cash || 0));
    setPositionsCount((data.positions || []).length);
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPortfolio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    }
    setRefreshing(false);
  };

  const last = series.at(-1)?.v ?? 0;
  const prev = series.length >= 2 ? series.at(-2)!.v : last;
  const dayChange = last - prev;
  const dayChangePct = prev !== 0 ? (dayChange / prev) * 100 : 0;
  const totalPnl = useMemo(() => totalValue - totalCost, [totalValue, totalCost]);
  const totalPnlPct = useMemo(() => (totalCost > 0 ? (totalPnl / totalCost) * 100 : 0), [totalPnl, totalCost]);

  // Filter series by selected range for the chart only (KPIs remain lifetime-based)
  const filteredSeries = useMemo(() => {
    if (!series.length) return series;
    const now = new Date();
    const start = new Date(now);
    if (range === "30D") {
      start.setDate(start.getDate() - 30);
    } else if (range === "3M") {
      start.setMonth(start.getMonth() - 3);
    } else if (range === "1Y") {
      start.setFullYear(start.getFullYear() - 1);
    } else if (range === "3Y") {
      start.setFullYear(start.getFullYear() - 3);
    }
    // If a point lacks a valid date, keep it (defensive), otherwise filter by date
    return series.filter((p) => {
      const dt = new Date(p.t);
      return isNaN(dt.getTime()) ? true : dt >= start;
    });
  }, [series, range]);

  const StatCard = ({ 
    title, 
    value, 
    change, 
    changePercent, 
    icon: Icon, 
    trend = 'up', 
    subtitle 
  }: { 
    title: string; 
    value: string | number; 
    change?: string; 
    changePercent?: number; 
    icon: React.ComponentType<{ size?: number; className?: string }>; 
    trend?: 'up' | 'down'; 
    subtitle?: string;
  }) => (
    <div className="group relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 transition-all duration-300 hover:shadow-medium hover:-translate-y-1">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-soft transition-transform duration-300 group-hover:scale-110 ${
          trend === 'down' ? 'from-red-500 to-red-600' : 'from-emerald-500 to-emerald-600'
        }`}>
          <Icon className="h-6 w-6 text-white" />
        </div>

        {changePercent && (
          <div className={`flex items-center space-x-1 text-sm font-medium ${
            trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {trend === 'up' ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            <span>{changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}%</span>
          </div>
        )}
      </div>

      <div className="space-y-1 mt-4">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{title}</p>
        <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">{value}</p>
        {change && (
          <p className={`text-sm font-medium flex items-center space-x-1 ${
            trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            <span>{trend === 'up' ? '+' : ''}{change}</span>
            {subtitle && <span className="text-neutral-500 dark:text-neutral-400">{subtitle}</span>}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full bg-neutral-50 dark:bg-neutral-950 p-6">
      <div className="max-w-[1400px] mx-auto h-full">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
              Portfolio Overview
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Track your investment performance and analyze your holdings
            </p>
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <Plus className="w-4 h-4" />
              Add Position
            </button>
            <button 
              onClick={handleRefresh} 
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-all ${
                refreshing ? 'opacity-70' : ''
              }`}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Total Portfolio Value" 
              value={`$${last.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`} 
              change={`$${Math.abs(dayChange).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`} 
              changePercent={Math.abs(dayChangePct)} 
              icon={DollarSign} 
              trend={dayChange >= 0 ? 'up' : 'down'} 
              subtitle="vs prev" 
            />
            <StatCard 
              title="Total Gain/Loss" 
              value={`$${Math.abs(totalPnl).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`} 
              changePercent={Math.abs(totalPnlPct)} 
              icon={TrendingUp} 
              trend={totalPnl >= 0 ? 'up' : 'down'} 
              subtitle="since inception" 
            />
            <StatCard 
              title="Active Positions" 
              value={positionsCount} 
              icon={Briefcase} 
              subtitle="holdings" 
            />
            <StatCard 
              title="Buying Power" 
              value={`$${cash.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`} 
              icon={Activity} 
              subtitle="available" 
            />
          </div>

          {/* Portfolio Chart */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                  Portfolio Performance
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Track your portfolio growth over time
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {(["30D","3M","1Y","3Y"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setRange(opt)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      range === opt
                        ? "bg-emerald-600 text-white"
                        : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                    aria-pressed={range === opt}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="opacity-100 transition-opacity" aria-busy={loading}>
              <PortfolioChart data={filteredSeries} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
