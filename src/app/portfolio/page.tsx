"use client";
import { useEffect, useState } from "react";
import { PortfolioChart } from "@/components/metrics/portfolio-chart";
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

type Pt = { t: string; v: number };

export default function PortfolioPage() {
  const [series, setSeries] = useState<Pt[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // placeholder: synthesize a small series from last 30 days using SPY close via prices API if available later
    const today = new Date();
    const arr: Pt[] = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (29 - i));
      return { t: d.toISOString().slice(0, 10), v: 10000 + Math.sin(i / 5) * 250 + i * 10 };
    });
    setSeries(arr);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

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
              value="$125,847.32" 
              change="$2,847.23" 
              changePercent={2.31} 
              icon={DollarSign} 
              trend="up" 
              subtitle="today" 
            />
            <StatCard 
              title="Total Gain/Loss" 
              value="$18,234.56" 
              changePercent={16.94} 
              icon={TrendingUp} 
              trend="up" 
              subtitle="all time" 
            />
            <StatCard 
              title="Active Positions" 
              value="5" 
              icon={Briefcase} 
              subtitle="holdings" 
            />
            <StatCard 
              title="Buying Power" 
              value="$12,350.00" 
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
                <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white">
                  30D
                </button>
                <button className="px-3 py-1.5 text-xs font-medium rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  3M
                </button>
                <button className="px-3 py-1.5 text-xs font-medium rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  1Y
                </button>
              </div>
            </div>
            <PortfolioChart data={series} />
          </div>
        </div>
      </div>
    </div>
  );
}
