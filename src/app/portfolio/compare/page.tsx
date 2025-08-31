"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Users, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download
} from "lucide-react";

type Account = { id: string; name: string };
type CompResp = {
  portfolio: { cash: number; totalValue: number; totalCost: number; totalPnl: number; totalPnlPct?: number; positions: Array<{ symbol: string; qty: number; price?: number; value?: number; cost: number; ror?: number }>; };
  benchmark: { name: string; tickers: string[]; avgPrice: number };
};

export default function ComparePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [comp, setComp] = useState<CompResp | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((j) => {
      const list: Account[] = j.data || [];
      if (list.length === 0) {
        fetch("/api/accounts", { method: "POST" }).then((r) => r.json()).then((k) => {
          setAccounts([k.data]);
          setAccountId(k.data.id);
        });
      } else {
        setAccounts(list);
        setAccountId(list[0].id);
      }
    });
  }, []);

  async function runCompare() {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/portfolio/compare?accountId=${encodeURIComponent(accountId)}`);
      const j = await res.json();
      setComp(j);
    } finally {
      setLoading(false);
    }
  }

  const posCount = comp?.portfolio.positions.length || 0;
  const topMovers = useMemo(() => (comp?.portfolio.positions || [])
    .filter((p) => typeof p.ror === "number")
    .sort((a, b) => (b.ror! - a.ror!))
    .slice(0, 5), [comp]);

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
              Portfolio vs Top 30
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Compare your portfolio performance against major market benchmarks
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Account Selection */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                  Select Portfolio
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Choose which portfolio to compare against the benchmark
                </p>
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-6 items-end">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Account</label>
                <select 
                  className="border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                  value={accountId} 
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-4" />
              <div>
                <Button 
                  onClick={runCompare} 
                  disabled={!accountId || loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  {loading ? "Analyzing..." : "Run Comparison"}
                </Button>
              </div>
            </div>
          </div>

          {comp && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  title="Portfolio Value" 
                  value={`$${comp.portfolio.totalValue.toFixed(2)}`}
                  icon={TrendingUp} 
                  trend="up"
                />
                <StatCard 
                  title="Total P&L" 
                  value={`$${comp.portfolio.totalPnl.toFixed(2)}`}
                  changePercent={comp.portfolio.totalPnlPct}
                  icon={comp.portfolio.totalPnl >= 0 ? TrendingUp : TrendingDown} 
                  trend={comp.portfolio.totalPnl >= 0 ? "up" : "down"}
                />
                <StatCard 
                  title="Positions" 
                  value={posCount}
                  icon={BarChart3} 
                  subtitle="holdings"
                />
                <StatCard 
                  title="Cash" 
                  value={`$${comp.portfolio.cash.toFixed(2)}`}
                  icon={Users} 
                  subtitle="available"
                />
              </div>

              {/* Comparison Cards */}
              <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                        Portfolio Summary
                      </h2>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Your portfolio performance metrics
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                      <div className="text-neutral-600 dark:text-neutral-400 mb-1">Positions</div>
                      <div className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{posCount}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                      <div className="text-neutral-600 dark:text-neutral-400 mb-1">Cash</div>
                      <div className="text-xl font-bold text-neutral-900 dark:text-neutral-50">${comp.portfolio.cash.toFixed(2)}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                      <div className="text-neutral-600 dark:text-neutral-400 mb-1">Total Value</div>
                      <div className="text-xl font-bold text-neutral-900 dark:text-neutral-50">${comp.portfolio.totalValue.toFixed(2)}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                      <div className="text-neutral-600 dark:text-neutral-400 mb-1">P&L</div>
                      <div className={`text-xl font-bold ${comp.portfolio.totalPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {comp.portfolio.totalPnl >= 0 ? "+" : ""}${comp.portfolio.totalPnl.toFixed(2)}
                        {comp.portfolio.totalPnlPct != null && (
                          <span className="text-sm ml-1">({comp.portfolio.totalPnlPct.toFixed(2)}%)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                        Benchmark Overview
                      </h2>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {comp.benchmark.name} comparison
                      </p>
                    </div>
                    <Target className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Average Price (EW)</div>
                      <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">${comp.benchmark.avgPrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Top 30 Tickers</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                        {comp.benchmark.tickers.join(", ")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Movers Table */}
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                      Top Performers (ROR)
                    </h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Your best performing positions by rate of return
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                      <tr>
                        <th className="pb-3 font-medium">Symbol</th>
                        <th className="pb-3 font-medium">Quantity</th>
                        <th className="pb-3 font-medium">Price</th>
                        <th className="pb-3 font-medium">Value</th>
                        <th className="pb-3 font-medium">ROR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topMovers.map((p) => (
                        <tr key={p.symbol} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                          <td className="py-4">
                            <div className="font-medium text-neutral-900 dark:text-neutral-50">{p.symbol}</div>
                          </td>
                          <td className="py-4 text-neutral-600 dark:text-neutral-400">{p.qty}</td>
                          <td className="py-4 text-neutral-600 dark:text-neutral-400">
                            {p.price != null ? `$${p.price.toFixed(2)}` : "—"}
                          </td>
                          <td className="py-4 text-neutral-600 dark:text-neutral-400">
                            {p.value != null ? `$${p.value.toFixed(2)}` : "—"}
                          </td>
                          <td className={`py-4 font-medium ${p.ror != null ? (p.ror >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400") : "text-neutral-400"}`}>
                            {p.ror != null ? `${p.ror.toFixed(2)}%` : "—"}
                          </td>
                        </tr>
                      ))}
                      {topMovers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-neutral-500 dark:text-neutral-400">
                            No performance data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
