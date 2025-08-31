"use client";
import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingDown,
  Filter,
  Plus,
  Download,
  Upload,
  Activity,
  TrendingUp,
  MoreHorizontal,
  ExternalLink,
  Briefcase,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import { usePortfolioData, useHistoricalData, useMarketData } from "@/hooks/usePortfolioData";

type IconType = React.ComponentType<{ size?: number; className?: string }>;

interface Position {
  symbol: string;
  qty: number;
  price: number;
  value: number;
  cost: number;
  pnl: number;
  pnlPct: number;
}

// Helper function to map symbols to sectors (simplified)
function getSectorForSymbol(symbol: string): string {
  const sectorMap: Record<string, string> = {
    'AAPL': 'Technology',
    'MSFT': 'Technology',
    'GOOGL': 'Technology',
    'AMZN': 'Technology',
    'NVDA': 'Technology',
    'TSLA': 'Automotive',
    'META': 'Technology',
    'JNJ': 'Healthcare',
    'PFE': 'Healthcare',
    'UNH': 'Healthcare',
    'JPM': 'Finance',
    'BAC': 'Finance',
    'WFC': 'Finance',
    'XOM': 'Energy',
    'CVX': 'Energy',
    'COP': 'Energy',
  };
  
  return sectorMap[symbol] || 'Other';
}

// Helper function to get company name from symbol (simplified)
function getCompanyName(symbol: string): string {
  const nameMap: Record<string, string> = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'NVDA': 'NVIDIA Corporation',
    'TSLA': 'Tesla, Inc.',
    'META': 'Meta Platforms Inc.',
    'JNJ': 'Johnson & Johnson',
    'PFE': 'Pfizer Inc.',
    'UNH': 'UnitedHealth Group Inc.',
    'JPM': 'JPMorgan Chase & Co.',
    'BAC': 'Bank of America Corp.',
    'WFC': 'Wells Fargo & Company',
    'XOM': 'Exxon Mobil Corporation',
    'CVX': 'Chevron Corporation',
    'COP': 'ConocoPhillips',
  };
  
  return nameMap[symbol] || symbol;
}

interface Transaction {
  id: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  date: string;
  total: number;
}

const StockSenseDashboard = () => {
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>(undefined);
  const [selectedPeriod, setSelectedPeriod] = useState("6M");
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  
  // Fetch real portfolio data
  const { data: portfolioData, loading: portfolioLoading, error: portfolioError, refetch: refetchPortfolio } = usePortfolioData(selectedAccount);
  const { data: historicalData, loading: historicalLoading, refetch: refetchHistorical } = useHistoricalData(selectedAccount, selectedPeriod);
  
  // Market indices symbols
  const marketSymbols = ['SPY', 'QQQ', 'DIA', 'VIX'];
  const { data: marketData, loading: marketLoading } = useMarketData(marketSymbols);

  // Load accounts on mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await fetch('/api/accounts');
        const result = await response.json();
        const accountList = result.data || [];
        
        if (accountList.length === 0) {
          // Create default account if none exist
          const createResponse = await fetch('/api/accounts', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'My Portfolio' })
          });
          const newAccount = await createResponse.json();
          if (!newAccount.data?.id) throw new Error("Created account is missing an ID.");
          setAccounts([newAccount.data]);
          setSelectedAccount(newAccount.data.id);
        } else {
          setAccounts(accountList);
          setSelectedAccount(accountList[0].id);
        }
      } catch (error) {
        console.error('Error loading accounts:', error);
      }
    };
    
    loadAccounts();
  }, []);

  const handleRefresh = async () => {
    await Promise.all([
      refetchPortfolio(),
      refetchHistorical()
    ]);
  };

  // Prepare chart data from historical data
  const chartData = historicalData?.portfolioHistory.map((point, index) => {
    const benchmarkPoint = historicalData.benchmark[index];
    return {
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short' }),
      value: point.value,
      benchmark: benchmarkPoint?.value || 0
    };
  }) || [];

  // Calculate allocation data from positions
  const allocationData = portfolioData?.positions.reduce((acc, position) => {
    // Simple sector mapping - you could enhance this with a proper sector API
    const sector = getSectorForSymbol(position.symbol);
    const existing = acc.find(item => item.name === sector);
    
    if (existing) {
      existing.value += position.value;
    } else {
      acc.push({
        name: sector,
        value: position.value,
        percentage: 0 // Will calculate below
      });
    }
    
    return acc;
  }, [] as Array<{ name: string; value: number; percentage: number }>) || [];

  // Calculate percentages
  const totalValue = allocationData.reduce((sum, item) => sum + item.value, 0);
  allocationData.forEach(item => {
    item.percentage = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;
  });

  // Get recent transactions (mock for now - you could add a real API)
  const recentTransactions: Transaction[] = [
    // This would come from a real API
  ];

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

  // Show loading state
  if (portfolioLoading || historicalLoading) {
    return (
      <div className="h-full bg-neutral-50 dark:bg-neutral-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-emerald-600" />
          <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Loading Portfolio Data...</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Fetching your latest portfolio information</p>
        </div>
      </div>
    );
  }

  // Fallback portfolio object to avoid hard error/empty screens
  const portfolio = portfolioData ?? {
    totalValue: 0,
    totalCost: 0,
    totalPnl: 0,
    totalPnlPct: 0,
    dayChange: 0,
    dayChangePercent: 0,
    positions: [] as Array<Position>,
    cash: 0,
    equityCurve: [] as Array<{ t: string; v: number }>,
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
    icon: IconType; 
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

  const PositionRow = ({ position }: { position: Position }) => {
    const avgCost = position.cost / position.qty;
    const totalGainLoss = position.pnl;
    const gainLossPercent = position.pnlPct;
    const isPositive = totalGainLoss >= 0;
    const companyName = getCompanyName(position.symbol);
    
    // Calculate daily change (simplified - using pnl as proxy)
    const dayChange = gainLossPercent;
    
    return (
      <div className="group flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-all duration-300 hover:shadow-medium hover:border-emerald-200 dark:hover:border-emerald-800">
        <div className="flex items-center space-x-4 flex-1">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-soft transition-transform duration-300 group-hover:scale-110 ${
            dayChange > 0 
              ? 'from-emerald-500 to-emerald-600' 
              : 'from-red-500 to-red-600'
          }`}>
            <span className="text-white font-bold text-sm">{position.symbol.charAt(0)}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-50">{position.symbol}</h3>
              <ExternalLink className="w-4 h-4 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">{companyName}</p>
            <p className="text-xs text-neutral-500 mt-1">
              {position.qty} shares @ ${position.price.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="text-right mr-6">
          <p className="font-bold text-lg text-neutral-900 dark:text-neutral-50 mb-1">
            ${position.value.toLocaleString()}
          </p>
          <div className={`text-sm font-medium flex items-center justify-end space-x-1 mb-1 ${
            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{isPositive ? '+' : ''}${totalGainLoss.toFixed(2)}</span>
            <span className="text-xs">({gainLossPercent.toFixed(1)}%)</span>
          </div>
          <p className="text-xs text-neutral-500">Avg: ${avgCost.toFixed(2)}</p>
        </div>

        <div className="text-right min-w-[80px]">
          <div className={`text-sm font-semibold flex items-center justify-end space-x-1 ${
            dayChange > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {dayChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{dayChange > 0 ? '+' : ''}{dayChange.toFixed(2)}%</span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">Today</p>
        </div>

        <button className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 opacity-0 group-hover:opacity-100 transition-all">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const TransactionRow = ({ transaction }: { transaction: Transaction }) => (
    <div className="group flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-all duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-800">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${
          transaction.type === 'BUY' 
            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' 
            : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
        }`}>
          {transaction.type === 'BUY' ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownRight className="w-4 h-4" />
          )}
        </div>
        <div>
          <p className="font-medium text-neutral-900 dark:text-neutral-50">
            {transaction.type} {transaction.shares} {transaction.symbol}
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {transaction.date} @ ${transaction.price}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-neutral-900 dark:text-neutral-50">
          ${transaction.total.toLocaleString()}
        </p>
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
              Monitor your investments and track performance in real-time
            </p>
            {accounts.length > 1 && (
              <div className="mt-3">
                <select 
                  value={selectedAccount || ''} 
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm"
                >
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button 
              onClick={handleRefresh} 
              disabled={portfolioLoading || historicalLoading}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-all ${
                (portfolioLoading || historicalLoading) ? 'opacity-70' : ''
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${(portfolioLoading || historicalLoading) ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {/* KPI Cards */}
          {portfolioError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">Error loading portfolio</p>
                <p className="text-sm opacity-80">{portfolioError}</p>
              </div>
              <button onClick={handleRefresh} className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700">Try Again</button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"> 
            <StatCard 
              title="Total Portfolio Value" 
              value={`$${(portfolio.totalValue || 0).toLocaleString()}`} 
              change={`$${(portfolio.dayChange || 0).toLocaleString()}`} 
              changePercent={portfolio.dayChangePercent || 0} 
              icon={DollarSign} 
              trend={portfolio.dayChange >= 0 ? "up" : "down"} 
              subtitle="today" 
            />
            <StatCard 
              title="Total Gain/Loss" 
              value={`$${(portfolio.totalPnl || 0).toLocaleString()}`} 
              changePercent={portfolio.totalPnlPct || 0} 
              icon={TrendingUp} 
              trend={portfolio.totalPnl >= 0 ? "up" : "down"} 
              subtitle="all time" 
            />
            <StatCard 
              title="Active Positions" 
              value={portfolio.positions.length || 0} 
              icon={Briefcase} 
              subtitle="holdings" 
            />
            <StatCard 
              title="Cash Available" 
              value={`$${(portfolio.cash || 0).toLocaleString()}`} 
              icon={Activity} 
              subtitle="buying power" 
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Performance Chart */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                      Portfolio Performance
                    </h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Track your portfolio growth over time vs benchmark
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {['1M', '3M', '6M', '1Y', 'ALL'].map((period) => (
                      <button 
                        key={period}
                        onClick={() => setSelectedPeriod(period)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          selectedPeriod === period 
                            ? 'bg-emerald-600 text-white' 
                            : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" className="dark:stroke-neutral-700" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#737373"
                        className="dark:stroke-neutral-400"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#737373"
                        className="dark:stroke-neutral-400"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e5e5e5', 
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                        }} 
                        wrapperStyle={{ color: '#0a0a0a' }}
                        labelFormatter={(label) => `Period: ${label}`}
                        formatter={(value: number | string, name: string) => [
                          `$${value.toLocaleString()}`,
                          name === 'value' ? 'Portfolio' : 'Benchmark'
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} 
                        activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="benchmark" 
                        stroke="#94a3b8" 
                        strokeWidth={2} 
                        strokeDasharray="5 5" 
                        dot={false} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Allocation Chart */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                  Asset Allocation
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Distribution of your portfolio
                </p>
              </div>
              <div className="h-64 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={allocationData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={50} 
                      outerRadius={90} 
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {allocationData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e5e5e5', 
                        borderRadius: '8px' 
                      }}
                      formatter={(value: number | string, name: string) => [
                        `$${value.toLocaleString()}`,
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {allocationData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Holdings and Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Holdings Table */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                      Current Holdings
                    </h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Manage and monitor your active positions
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                      <Filter className="w-4 h-4" />
                      Filter
                    </button>
                    <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
                      <Plus className="w-4 h-4" />
                      Add Position
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {portfolio.positions.map((position, index) => (
                    <PositionRow key={index} position={position} />
                  )) || (
                    <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                      No positions found. Add some transactions to get started.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                    Recent Activity
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Latest transactions and updates
                  </p>
                </div>
                <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors">
                  View All
                </button>
              </div>
              <div className="space-y-3 mb-6">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction) => (
                    <TransactionRow key={transaction.id} transaction={transaction} />
                  ))
                ) : (
                  <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                    <Activity className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                    <p className="font-medium mb-1">No Recent Activity</p>
                    <p className="text-sm">Your recent transactions will appear here</p>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button className="w-full py-3 text-sm font-medium rounded-lg text-emerald-700 hover:text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/50 transition-all">
                  View Transaction History
                </button>
              </div>
            </div>
          </div>

          {/* Market Overview & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Market Overview */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                    Market Overview
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Key market indices and indicators
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Live</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {marketData.length > 0 ? (
                  marketData.map((index) => (
                    <div key={index.symbol} className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                        {index.symbol === 'SPY' ? 'S&P 500' : 
                         index.symbol === 'QQQ' ? 'NASDAQ' : 
                         index.symbol === 'DIA' ? 'DOW' : 
                         index.symbol}
                      </p>
                      <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mb-1">
                        ${index.price.toFixed(2)}
                      </p>
                      <div className={`text-sm font-medium flex items-center space-x-1 ${
                        index.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {index.changePercent >= 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        <span>{index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%</span>
                      </div>
                    </div>
                  ))
                ) : marketLoading ? (
                  [1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 animate-pulse">
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded mb-2"></div>
                      <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded mb-1"></div>
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-16"></div>
                    </div>
                  ))
                ) : (
                  [
                    { name: 'S&P 500', value: '4,337.44', change: '+0.68%', trend: 'up' },
                    { name: 'NASDAQ', value: '13,461.92', change: '+1.23%', trend: 'up' },
                    { name: 'DOW', value: '34,152.01', change: '+0.45%', trend: 'up' },
                    { name: 'VIX', value: '19.84', change: '-2.15%', trend: 'down' },
                  ].map((index, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                        {index.name}
                      </p>
                      <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50 mb-1">
                        {index.value}
                      </p>
                      <div className={`text-sm font-medium flex items-center space-x-1 ${
                        index.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {index.trend === 'up' ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        <span>{index.change}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                  Quick Actions
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Common portfolio management tasks
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Buy Stock', icon: Plus, color: 'emerald' },
                  { label: 'Sell Stock', icon: TrendingDown, color: 'red' },
                  { label: 'Import Data', icon: Upload, color: 'emerald' },
                  { label: 'Export Report', icon: Download, color: 'emerald' }
                ].map((action, idx) => (
                  <button 
                    key={idx} 
                    className="group p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all duration-300 hover:shadow-medium hover:-translate-y-1"
                  >
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                      action.color === 'red' 
                        ? 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400' 
                        : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      <action.icon className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {action.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockSenseDashboard;
