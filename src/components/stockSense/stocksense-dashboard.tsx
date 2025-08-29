"use client";
import React, { useState } from "react";
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

type IconType = React.ComponentType<{ size?: number; className?: string }>;

interface Position {
  symbol: string;
  name: string;
  shares: number;
  price: number;
  value: number;
  change: number;
  avgCost: number;
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
  const [refreshing, setRefreshing] = useState(false);

  const portfolioData = {
    totalValue: 125847.32,
    dayChange: 2847.23,
    dayChangePercent: 2.31,
    totalGainLoss: 18234.56,
    totalGainLossPercent: 16.94,
    positions: [
      { symbol: 'AAPL', name: 'Apple Inc.', shares: 50, price: 175.43, value: 8771.5, change: 2.15, avgCost: 165.2 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', shares: 30, price: 378.85, value: 11365.5, change: 1.87, avgCost: 340.12 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 25, price: 138.21, value: 3455.25, change: -0.95, avgCost: 142.5 },
      { symbol: 'TSLA', name: 'Tesla, Inc.', shares: 40, price: 243.84, value: 9753.6, change: 3.42, avgCost: 220.15 },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', shares: 20, price: 875.28, value: 17505.6, change: 4.23, avgCost: 740.85 }
    ],
    recentTransactions: [
      { id: 1, symbol: 'AAPL', type: 'BUY' as const, shares: 10, price: 175.43, date: '2024-03-15', total: 1754.30 },
      { id: 2, symbol: 'MSFT', type: 'SELL' as const, shares: 5, price: 378.85, date: '2024-03-14', total: 1894.25 },
      { id: 3, symbol: 'GOOGL', type: 'BUY' as const, shares: 8, price: 138.21, date: '2024-03-13', total: 1105.68 }
    ]
  };

  const chartData = [
    { date: 'Jan', value: 98500, benchmark: 95200 },
    { date: 'Feb', value: 102400, benchmark: 98800 },
    { date: 'Mar', value: 105600, benchmark: 101500 },
    { date: 'Apr', value: 108900, benchmark: 104200 },
    { date: 'May', value: 112300, benchmark: 107800 },
    { date: 'Jun', value: 125847, benchmark: 118900 }
  ];

  const allocationData = [
    { name: 'Technology', value: 65420, percentage: 52 },
    { name: 'Healthcare', value: 25169, percentage: 20 },
    { name: 'Finance', value: 18877, percentage: 15 },
    { name: 'Energy', value: 12585, percentage: 10 },
    { name: 'Other', value: 3796, percentage: 3 }
  ];

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

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
    const totalGainLoss = (position.price - position.avgCost) * position.shares;
    const gainLossPercent = ((position.price - position.avgCost) / position.avgCost) * 100;
    const isPositive = totalGainLoss >= 0;
    
    return (
      <div className="group flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-all duration-300 hover:shadow-medium hover:border-emerald-200 dark:hover:border-emerald-800">
        <div className="flex items-center space-x-4 flex-1">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-soft transition-transform duration-300 group-hover:scale-110 ${
            position.change > 0 
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
            <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">{position.name}</p>
            <p className="text-xs text-neutral-500 mt-1">
              {position.shares} shares @ ${position.price.toFixed(2)}
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
          <p className="text-xs text-neutral-500">Avg: ${position.avgCost.toFixed(2)}</p>
        </div>

        <div className="text-right min-w-[80px]">
          <div className={`text-sm font-semibold flex items-center justify-end space-x-1 ${
            position.change > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {position.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{position.change > 0 ? '+' : ''}{position.change}%</span>
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
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <Download className="w-4 h-4" />
              Export
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
              value={`$${portfolioData.totalValue.toLocaleString()}`} 
              change={`$${portfolioData.dayChange.toLocaleString()}`} 
              changePercent={portfolioData.dayChangePercent} 
              icon={DollarSign} 
              trend="up" 
              subtitle="today" 
            />
            <StatCard 
              title="Total Gain/Loss" 
              value={`$${portfolioData.totalGainLoss.toLocaleString()}`} 
              changePercent={portfolioData.totalGainLossPercent} 
              icon={TrendingUp} 
              trend="up" 
              subtitle="all time" 
            />
            <StatCard 
              title="Active Positions" 
              value={portfolioData.positions.length} 
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
                    <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white">
                      6M
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                      1Y
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                      All
                    </button>
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
                  {portfolioData.positions.map((position, index) => (
                    <PositionRow key={index} position={position} />
                  ))}
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
                {portfolioData.recentTransactions.map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))}
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
                {[
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
                ))}
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
