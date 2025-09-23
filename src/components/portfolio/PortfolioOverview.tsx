"use client";
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { computePortfolioTotals, formatUSD } from '@/lib/utils/money';

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
  const [loading, setLoading] = React.useState(true);
  const [state, setState] = React.useState<{ value:number; dayChange:number; totalGain:number; cash:number; cost:number }|null>(null);

  React.useEffect(()=>{
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/portfolio', { cache:'no-store' });
        interface ApiPosition { symbol:string; qty:number; cost:number; price?:number; }
        interface ApiResponse { cash?:number; positions?:ApiPosition[] }
        const data: ApiResponse = await res.json();
        const positions = (data.positions||[]).map(p=>({
          shares: p.qty,
          price: p.price,
          prevClose: p.price, // placeholder (API doesn't return prev close yet)
          costBasis: p.cost,
        }));
        const totals = computePortfolioTotals(positions);
        const cost = (data.positions||[]).reduce((s:number,p)=>s + (p.cost||0),0);
        if (active) setState({
          value: totals.marketValue,
          dayChange: totals.dayChange, // currently 0 due to prevClose placeholder
          totalGain: totals.totalGainLoss,
          cash: data.cash ?? 0,
          cost,
        });
      } catch (e) {
        console.error('[PortfolioOverview] failed to load', e);
      } finally { if (active) setLoading(false); }
    })();
    return ()=>{ active=false; };
  }, []);

  if (loading || !state) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 animate-pulse">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
            <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded mb-1" />
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  const gainPct = state.cost>0 ? (state.totalGain/state.cost)*100 : 0;
  const dayPct = state.value>0 ? (state.dayChange/state.value)*100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Portfolio Value"
        value={formatUSD(state.value)}
        change={formatUSD(state.totalGain)}
        changePercent={`${gainPct.toFixed(2)}%`}
        isPositive={state.totalGain >= 0}
      />
      <MetricCard
        label="Day Change"
        value={formatUSD(state.dayChange)}
        changePercent={`${dayPct.toFixed(2)}%`}
        isPositive={state.dayChange >= 0}
      />
      <MetricCard
        label="Total Gain/Loss"
        value={formatUSD(state.totalGain)}
        changePercent={`${gainPct.toFixed(2)}%`}
        isPositive={state.totalGain >= 0}
      />
      <MetricCard
        label="Cash Balance"
        value={formatUSD(state.cash)}
      />
    </div>
  );
};