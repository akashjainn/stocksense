"use client";
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  changePercent?: string;
  isPositive?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, change, changePercent, isPositive = true }) => {
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{label}</span>
        {change && (
          <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            <TrendIcon className="h-3 w-3" />
            {changePercent}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
        {value}
      </div>
      {change && (
        <div className={`text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{change}
        </div>
      )}
    </div>
  );
};

export const PortfolioOverview: React.FC = () => {
  const [metrics, setMetrics] = React.useState({
    totalValue: '$0.00',
    totalGain: '$0.00',
    totalGainPercent: '0.00%',
    dayChange: '$0.00',
    dayChangePercent: '0.00%',
    cashBalance: '$0.00'
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchPortfolioMetrics = async () => {
      try {
        const response = await fetch('/api/portfolio');
        const data = await response.json();
        
        if (data.summary) {
          setMetrics({
            totalValue: `$${data.summary.totalValue?.toLocaleString() || '0.00'}`,
            totalGain: `$${data.summary.totalGain?.toLocaleString() || '0.00'}`,
            totalGainPercent: `${data.summary.totalGainPercent?.toFixed(2) || '0.00'}%`,
            dayChange: `$${data.summary.dayChange?.toLocaleString() || '0.00'}`,
            dayChangePercent: `${data.summary.dayChangePercent?.toFixed(2) || '0.00'}%`,
            cashBalance: `$${data.summary.cashBalance?.toLocaleString() || '0.00'}`
          });
        }
      } catch (error) {
        console.error('Failed to fetch portfolio metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioMetrics();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 animate-pulse">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded mb-2"></div>
            <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded mb-1"></div>
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  const totalGainNum = parseFloat(metrics.totalGain.replace(/[$,]/g, ''));
  const dayChangeNum = parseFloat(metrics.dayChange.replace(/[$,]/g, ''));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Portfolio Value"
        value={metrics.totalValue}
        change={metrics.totalGain}
        changePercent={metrics.totalGainPercent}
        isPositive={totalGainNum >= 0}
      />
      <MetricCard
        label="Day Change"
        value={metrics.dayChange}
        changePercent={metrics.dayChangePercent}
        isPositive={dayChangeNum >= 0}
      />
      <MetricCard
        label="Total Gain/Loss"
        value={metrics.totalGain}
        changePercent={metrics.totalGainPercent}
        isPositive={totalGainNum >= 0}
      />
      <MetricCard
        label="Cash Balance"
        value={metrics.cashBalance}
      />
    </div>
  );
};