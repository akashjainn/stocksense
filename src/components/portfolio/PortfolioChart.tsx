"use client";
import React from 'react';
import TimeSeriesArea from '@/components/charts/TimeSeriesArea';

interface PortfolioChartProps {
  period: string;
  onPeriodChange: (period: string) => void;
}

const PERIODS = ['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'];

export const PortfolioChart: React.FC<PortfolioChartProps> = ({ period, onPeriodChange }) => {
  const [chartData, setChartData] = React.useState<Array<{ date: string; value: number; benchmark?: number }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchHistoryData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/portfolio/history?period=${period}`);
        const data = await response.json();
        
        if (data.portfolioHistory) {
          setChartData(data.portfolioHistory);
        }
      } catch (error) {
        console.error('Failed to fetch portfolio history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryData();
  }, [period]);

  const isPositive = React.useMemo(() => {
    if (chartData.length < 2) return true;
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    return last >= first;
  }, [chartData]);

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Portfolio Performance</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Historical value over time</p>
        </div>
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all border ${
                period === p
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-transparent border-transparent text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="h-80">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-neutral-500">Loading portfolio data...</div>
          </div>
        ) : chartData.length > 0 ? (
          <TimeSeriesArea
            data={chartData}
            period={period}
            isPositive={isPositive}
            showBenchmark={true}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-sm text-neutral-500 mb-2">No portfolio data available</div>
              <div className="text-xs text-neutral-400">Add transactions to see performance charts</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};