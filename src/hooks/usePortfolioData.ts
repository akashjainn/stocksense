import { useState, useEffect, useCallback } from 'react';

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

  const fetchData = useCallback(async () => {
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
  }, [accountId]);

  useEffect(() => {
    fetchData();
  }, [accountId, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useHistoricalData(accountId?: string, period: string = '6M') {
  const [data, setData] = useState<HistoricalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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
  }, [accountId, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useMarketData(symbols: string[]) {
  const [data, setData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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
      const rows = (result.data || []) as Array<{ symbol: string; o: number; h: number; l: number; c: number; v: number; asOf: string }>;
      const marketData: MarketData[] = rows.map(r => ({
        symbol: r.symbol,
        price: r.c,
        change: r.c - r.o,
        changePercent: r.o ? ((r.c - r.o) / r.o) * 100 : 0,
        volume: r.v,
        timestamp: r.asOf || new Date().toISOString(),
      }));
      
      setData(marketData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  useEffect(() => {
    fetchData();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
