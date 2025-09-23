"use client";
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Position {
  symbol: string;
  qty: number;
  price: number | null;
  value: number | null;
  cost: number;
  pnl: number | null;
  pnlPct: number | null;
}

interface HoldingsTableProps {
  onPositionSelect: (symbol: string) => void;
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ onPositionSelect }) => {
  const [positions, setPositions] = React.useState<Position[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchPositions = async () => {
      try {
        const response = await fetch('/api/portfolio');
        const data = await response.json();
        
        if (data.positions) {
          setPositions(data.positions);
        }
      } catch (error) {
        console.error('Failed to fetch positions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Holdings</h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Holdings</h3>
        <span className="text-xs text-neutral-500">{positions.length} positions</span>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-auto pr-1">
        {positions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-sm text-neutral-500 mb-2">No positions yet</div>
            <div className="text-xs text-neutral-400">Add transactions to see your holdings</div>
          </div>
        ) : (
          positions.map((position) => {
            const isPositive = (position.pnlPct ?? 0) >= 0;
            const TrendIcon = isPositive ? TrendingUp : TrendingDown;

            return (
              <button
                key={position.symbol}
                onClick={() => onPositionSelect(position.symbol)}
                className="w-full flex items-center justify-between p-3 rounded-lg text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 group transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                      {position.symbol}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {position.qty} shares
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {position.price != null ? `$${position.price.toFixed(2)}` : '—'}
                    </span>
                    {position.pnlPct != null && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        isPositive ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        <TrendIcon className="h-3 w-3" />
                        {isPositive ? '+' : ''}{position.pnlPct.toFixed(2)}%
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {position.value != null ? `$${position.value.toLocaleString()}` : '—'}
                  </div>
                  {position.pnl != null && (
                    <div className={`text-xs font-medium ${
                      isPositive ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {isPositive ? '+' : ''}${position.pnl.toLocaleString()}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};