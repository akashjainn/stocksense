"use client";
import React from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  BarChart3, 
  Search, 
  Globe, 
  Activity,
  ArrowRight,
  Eye
} from "lucide-react";

export default function ResearchPage() {
  const [snapshot, setSnapshot] = React.useState<Array<{ name: string; value: number | null; changePct: number | null }> | null>(null);
  const [snapError, setSnapError] = React.useState<string | null>(null);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/market/snapshot', { cache: 'no-store' });
        const data = await res.json();
        if (!mounted) return;
        if (data?.data) setSnapshot(data.data);
      } catch (e) {
        if (!mounted) return;
        setSnapError(e instanceof Error ? e.message : 'Failed to load snapshot');
      }
    })();
    return () => { mounted = false; };
  }, []);
  const QuickActionCard = ({ 
    title, 
    description, 
    icon: Icon, 
    href, 
    color = 'emerald',
    badge
  }: { 
    title: string; 
    description: string; 
    icon: React.ComponentType<{ size?: number; className?: string }>; 
    href: string;
    color?: 'emerald' | 'blue' | 'purple' | 'orange';
    badge?: string;
  }) => {
    const colorClasses = {
      emerald: 'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
      blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
      orange: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
    };

    return (
      <Link href={href}>
        <div className="group relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 transition-all duration-300 hover:shadow-medium hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-soft transition-transform duration-300 group-hover:scale-110 ${colorClasses[color]}`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              {badge && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                  {badge}
                </span>
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 leading-relaxed">
              {description}
            </p>
            
            <div className="flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
              <span>Explore</span>
              <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </Link>
    );
  };

  const FeatureCard = ({
    title,
    description,
    status = 'available'
  }: {
    title: string;
    description: string;
    status?: 'available' | 'coming-soon';
  }) => (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
          {title}
        </h4>
        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
          status === 'available' 
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
            : 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400'
        }`}>
          {status === 'available' ? 'Available' : 'Coming Soon'}
        </span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
        {description}
      </p>
    </div>
  );

  return (
    <div className="h-full bg-neutral-50 dark:bg-neutral-950 p-6">
      <div className="max-w-[1400px] mx-auto h-full">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
              Research & Analysis
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Discover market insights and analyze investment opportunities
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">Live Data</span>
          </div>
        </div>

        <div className="space-y-8">
          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-6">
              Research Tools
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <QuickActionCard
                title="Live Market Data"
                description="Real-time quotes, charts, and market data for major stocks and indices"
                icon={Activity}
                href="/research/live"
                color="emerald"
                badge="Live"
              />
              <QuickActionCard
                title="Stock Analysis"
                description="Fundamental and technical analysis tools for individual securities"
                icon={BarChart3}
                href="/research/analysis"
                color="blue"
              />
              <QuickActionCard
                title="Market Screener"
                description="Filter and discover stocks based on financial metrics and criteria"
                icon={Search}
                href="/research/screener"
                color="purple"
              />
              <QuickActionCard
                title="Economic Calendar"
                description="Track important economic events and earnings announcements"
                icon={Globe}
                href="/research/calendar"
                color="orange"
              />
              <QuickActionCard
                title="Sector Analysis"
                description="Compare sector performance and identify market trends"
                icon={TrendingUp}
                href="/research/sectors"
                color="emerald"
              />
              <QuickActionCard
                title="Watchlists"
                description="Create and manage custom lists of stocks to monitor"
                icon={Eye}
                href="/watchlists"
                color="blue"
              />
            </div>
          </div>

          {/* Market Overview */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                  Market Snapshot
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Current market conditions and key indicators
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Live</span>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(snapshot ?? []).map((idx, i) => {
                const pct = idx.changePct != null ? (idx.changePct * 100).toFixed(2) + '%' : '—';
                const trendUp = (idx.changePct ?? 0) >= 0;
                return (
                  <div key={i} className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                      {idx.name}
                    </p>
                    <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mb-1">
                      {idx.value != null ? idx.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                    </p>
                    <div className={`text-sm font-medium ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {pct}
                    </div>
                  </div>
                );
              })}
              {!snapshot && (
                <div className="col-span-4 text-sm text-neutral-500 dark:text-neutral-400">Loading snapshot…{snapError ? ` (${snapError})` : ''}</div>
              )}
            </div>
          </div>

          {/* Features Grid */}
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-6">
              Research Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                title="Real-time Data"
                description="Live market data and quotes powered by professional data providers"
                status="available"
              />
              <FeatureCard
                title="Technical Indicators"
                description="Advanced charting with moving averages, RSI, MACD, and more"
                status="coming-soon"
              />
              <FeatureCard
                title="Fundamental Analysis"
                description="Company financials, ratios, and valuation metrics"
                status="coming-soon"
              />
              <FeatureCard
                title="AI Insights"
                description="Machine learning powered market analysis and predictions"
                status="coming-soon"
              />
              <FeatureCard
                title="News & Events"
                description="Aggregated financial news and market-moving events"
                status="coming-soon"
              />
              <FeatureCard
                title="Social Sentiment"
                description="Track social media sentiment and retail investor trends"
                status="coming-soon"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
