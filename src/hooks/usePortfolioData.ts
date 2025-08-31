import { useState, useEffect } from 'react';

export interface PortfolioData {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPct: number;
  dayChange: number;
  dayChangePercent: number;
  positions: Array<{
    symbol: string;
    qty: number;
    price: number;
    value: number;
    cost: number;
    pnl: number;
    pnlPct: number;
  }>;
  cash: number;
  equityCurve: Array<{ t: string; v: number }>;
}

export interface HistoricalData {
  portfolioHistory: Array<{ date: string; value: number }>;
  benchmark: Array<{ date: string; value: number }>;
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPct: number;
  period: string;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
}

export function usePortfolioData(accountId?: string) {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const url = accountId 
        ? `/api/portfolio?accountId=${encodeURIComponent(accountId)}`
        : '/api/portfolio';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio data');
      }
      
      const result = await response.json();
      
      // Calculate day change (simplified - using first and last equity curve points)
      const equityCurve = result.equityCurve || [];
      const dayChange = equityCurve.length >= 2 
        ? equityCurve[equityCurve.length - 1].v - equityCurve[equityCurve.length - 2].v
        : 0;
      const dayChangePercent = equityCurve.length >= 2 && equityCurve[equityCurve.length - 2].v > 0
        ? (dayChange / equityCurve[equityCurve.length - 2].v) * 100
        : 0;

      setData({
        totalValue: result.totalValue || 0,
        totalCost: result.totalCost || 0,
        totalPnl: (result.totalValue || 0) - (result.totalCost || 0),
        totalPnlPct: result.totalCost > 0 ? (((result.totalValue || 0) - result.totalCost) / result.totalCost) * 100 : 0,
        dayChange,
        dayChangePercent,
        positions: result.positions || [],
        cash: result.cash || 0,
        equityCurve: result.equityCurve || []
      });
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [accountId]);

  return { data, loading, error, refetch: fetchData };
}

export function useHistoricalData(accountId?: string, period: string = '6M') {
  const [data, setData] = useState<HistoricalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ period });
      if (accountId) {
        params.append('accountId', accountId);
      }
      
      const response = await fetch(`/api/portfolio/history?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }
      
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [accountId, period]);

  return { data, loading, error, refetch: fetchData };
}

export function useMarketData(symbols: string[]) {
  const [data, setData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (symbols.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/quotes?symbols=${symbols.join(',')}`);
      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }
      
      const result = await response.json();
      const marketData: MarketData[] = [];
      
      for (const [symbol, quote] of Object.entries(result.data || {})) {
        const q = quote as any;
        marketData.push({
          symbol,
          price: q.price || 0,
          change: q.change || 0,
          changePercent: q.changePercent || 0,
          volume: q.volume,
          timestamp: q.timestamp || new Date().toISOString()
        });
      }
      
      setData(marketData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [symbols.join(',')]);

  return { data, loading, error, refetch: fetchData };
}
