"use client";
import React, { useMemo, useState } from "react";
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
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  Activity,
  Plus,
  Filter,
  RefreshCw,
  Download,
  Upload,
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
  type: "BUY" | "SELL";
  shares: number;
  price: number;
  date: string; // ISO
  total: number;
}

const StockSenseDashboard = () => {
  const [refreshing, setRefreshing] = useState(false);

  const [portfolioData] = useState({
    totalValue: 125847.32,
    dayChange: 2847.32,
    dayChangePercent: 2.31,
    totalGainLoss: 15847.32,
    totalGainLossPercent: 14.42,
  positions: [
      { symbol: 'AAPL', name: 'Apple Inc.', shares: 50, price: 175.43, value: 8771.5, change: 2.15, avgCost: 165.2 },
      { symbol: 'MSFT', name: 'Microsoft Corp.', shares: 75, price: 378.85, value: 28413.75, change: -0.85, avgCost: 350.0 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 25, price: 2847.32, value: 71183.0, change: 1.24, avgCost: 2650.0 },
      { symbol: 'TSLA', name: 'Tesla Inc.', shares: 30, price: 248.5, value: 7455.0, change: -3.21, avgCost: 280.0 },
      { symbol: 'NVDA', name: 'NVIDIA Corp.', shares: 15, price: 875.3, value: 13129.5, change: 4.67, avgCost: 720.0 },
    ],
    recentTransactions: [
      { id: 1, symbol: 'AAPL', type: 'BUY' as const, shares: 10, price: 175.43, date: '2024-08-28', total: 1754.3 },
      { id: 2, symbol: 'NVDA', type: 'BUY' as const, shares: 5, price: 875.3, date: '2024-08-27', total: 4376.5 },
      { id: 3, symbol: 'TSLA', type: 'SELL' as const, shares: 5, price: 248.5, date: '2024-08-26', total: 1242.5 },
    ],
  });

  const chartData = [
    { date: 'Jan', value: 120000, benchmark: 118000 },
    { date: 'Feb', value: 118500, benchmark: 119500 },
    { date: 'Mar', value: 122000, benchmark: 121000 },
    { date: 'Apr', value: 125000, benchmark: 123500 },
    { date: 'May', value: 123500, benchmark: 125000 },
    { date: 'Jun', value: 125847, benchmark: 126500 },
  ];

  const allocationData = useMemo(() => (
    portfolioData.positions.map((pos, index) => ({
      name: pos.symbol,
      value: pos.value,
      percentage: ((pos.value / portfolioData.totalValue) * 100).toFixed(1),
      color: ['#84CC16', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'][index],
    }))
  ), [portfolioData]);

  const COLORS = ['#84CC16', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const StatCard = ({
    title,
    value,
    change,
    changePercent,
    icon: Icon,
    trend,
    subtitle,
  }: {
    title: string;
    value: string | number;
    change?: string | number;
    changePercent?: number;
    icon: IconType;
    trend?: 'up' | 'down';
    subtitle?: string;
  }) => (
    <div className="group p-6 rounded-xl border transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between mb-4">
        <div className={`${trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-lime-100 text-lime-700'} p-3 rounded-lg transition-colors group-hover:bg-opacity-80`}>
          <Icon size={24} />
        </div>
        <div className="flex items-center space-x-1">
          {trend === 'up' ? <TrendingUp size={16} className="text-emerald-500" /> : trend === 'down' ? <TrendingDown size={16} className="text-red-500" /> : null}
          <span className={`text-sm font-semibold ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-neutral-500'}`}>
            {changePercent ? `${changePercent > 0 ? '+' : ''}${changePercent}%` : ''}
          </span>
        </div>
      </div>
      <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">{title}</div>
      <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-1">{value}</div>
      {change && (
        <div className={`text-sm font-medium ${trend === 'down' ? 'text-red-600' : 'text-emerald-600'}`}>
          {trend === 'up' ? '+' : ''}{change} {subtitle}
        </div>
      )}
    </div>
  );

  const PositionRow = ({ position }:{ position: Position }) => {
    const totalGainLoss = (position.price - position.avgCost) * position.shares;
    const gainLossPercent = ((position.price - position.avgCost) / position.avgCost) * 100;
    return (
      <div className="flex items-center justify-between p-4 rounded-lg border transition-all duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${position.change > 0 ? 'from-emerald-400 to-emerald-600' : 'from-red-400 to-red-600'} flex items-center justify-center shadow-lg`}>
            <span className="text-white font-bold">{position.symbol.charAt(0)}</span>
          </div>
          <div>
            <div className="font-semibold text-lg text-neutral-900 dark:text-neutral-50">{position.symbol}</div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">{position.name}</div>
            <div className="text-xs text-neutral-500">{position.shares} shares @ ${position.price.toFixed(2)}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-lg text-neutral-900 dark:text-neutral-50">${position.value.toLocaleString()}</div>
          <div className={`text-sm font-medium ${totalGainLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toFixed(2)} ({gainLossPercent.toFixed(1)}%)</div>
          <div className="text-xs text-neutral-500">Avg cost: ${position.avgCost.toFixed(2)}</div>
        </div>
        <div className={`text-right min-w-[80px] ${position.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          <div className="font-semibold">{position.change > 0 ? '+' : ''}{position.change}%</div>
          <div className="text-xs">Today</div>
        </div>
      </div>
    );
  };

  const TransactionRow = ({ transaction }:{ transaction: Transaction }) => (
    <div className="flex items-center justify-between p-3 rounded-lg border transition-all duration-200 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center space-x-3">
        <div className={`${transaction.type === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} w-8 h-8 rounded-full flex items-center justify-center`}>{transaction.type === 'BUY' ? '↑' : '↓'}</div>
        <div>
          <div className="font-medium text-neutral-900 dark:text-neutral-50">{transaction.type} {transaction.shares} {transaction.symbol}</div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">{transaction.date} @ ${transaction.price}</div>
        </div>
      </div>
      <div className="font-semibold text-neutral-900 dark:text-neutral-50">${transaction.total.toLocaleString()}</div>
    </div>
  );
  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Welcome back</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Here’s what’s happening with your investments today.</p>
          </div>
          <button onClick={handleRefresh} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${refreshing ? 'opacity-70' : ''} bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800`}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        <div className="flex-1 max-w-full">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Portfolio Value" value={`$${portfolioData.totalValue.toLocaleString()}`} change={`$${portfolioData.dayChange.toLocaleString()}`} changePercent={portfolioData.dayChangePercent} icon={DollarSign} trend="up" subtitle="today" />
              <StatCard title="Total Gain/Loss" value={`$${portfolioData.totalGainLoss.toLocaleString()}`} changePercent={portfolioData.totalGainLossPercent} icon={TrendingUp} trend="up" subtitle="all time" />
              <StatCard title="Active Positions" value={portfolioData.positions.length} icon={Briefcase} subtitle="holdings" />
              <StatCard title="Buying Power" value="$12,350.00" icon={Activity} subtitle="available" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-6 rounded-xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Portfolio Performance</h2>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 text-xs rounded-md bg-lime-500 text-black hover:bg-lime-400">6M</button>
                    <button className="px-3 py-1 text-xs rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800">1Y</button>
                    <button className="px-3 py-1 text-xs rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800">All</button>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-neutral-700" />
                      <XAxis dataKey="date" stroke="#6B7280" className="dark:stroke-neutral-400" />
                      <YAxis stroke="#6B7280" className="dark:stroke-neutral-400" />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }} wrapperStyle={{ color: '#111827' }} />
                      <Line type="monotone" dataKey="value" stroke="#84CC16" strokeWidth={3} dot={{ fill: '#84CC16', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, stroke: '#84CC16', strokeWidth: 2 }} />
                      <Line type="monotone" dataKey="benchmark" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="p-6 rounded-xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                <h2 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-50">Asset Allocation</h2>
                <div className="h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocationData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
                        {allocationData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {allocationData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-6 rounded-xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Your Holdings</h2>
                  <div className="flex space-x-2">
                    <button className="px-3 py-2 rounded-lg border text-sm bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800"><Filter size={16} className="inline mr-2" />Filter</button>
                    <button className="px-3 py-2 rounded-lg text-sm bg-lime-600 text-white hover:bg-lime-700"><Plus size={16} className="inline mr-2" />Add Position</button>
                  </div>
                </div>
                <div className="space-y-4">{portfolioData.positions.map((position, index) => (<PositionRow key={index} position={position} />))}</div>
              </div>
              <div className="p-6 rounded-xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Recent Activity</h2>
                  <button className="text-sm font-medium text-lime-700 hover:text-lime-600 dark:text-lime-400 dark:hover:text-lime-300">View All</button>
                </div>
                <div className="space-y-3">{portfolioData.recentTransactions.map((transaction) => (<TransactionRow key={transaction.id} transaction={transaction} />))}</div>
                <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <button className="w-full py-2 text-sm font-medium rounded-lg text-lime-700 hover:text-lime-600 hover:bg-lime-50 dark:text-lime-400 dark:hover:text-lime-300 dark:hover:bg-neutral-800">View Transaction History</button>
                </div>
              </div>
            </div>
            <div className="p-6 rounded-xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Market Overview</h2>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-lime-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Market Open</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'S&P 500', value: '4,337.44', change: '+0.68%', trend: 'up' },
                  { name: 'NASDAQ', value: '13,461.92', change: '+1.23%', trend: 'up' },
                  { name: 'DOW', value: '34,152.01', change: '+0.45%', trend: 'up' },
                  { name: 'VIX', value: '19.84', change: '-2.15%', trend: 'down' },
                ].map((index, idx) => (
                  <div key={idx} className="p-4 rounded-lg border bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
                    <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">{index.name}</div>
                    <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{index.value}</div>
                    <div className={`text-sm font-medium ${index.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>{index.change}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 rounded-xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
              <h2 className="text-lg font-semibold mb-6 text-neutral-900 dark:text-neutral-50">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[{ label: 'Buy Stock', icon: Plus, color: 'lime' },{ label: 'Sell Stock', icon: TrendingDown, color: 'red' },{ label: 'Import Data', icon: Upload, color: 'lime' },{ label: 'Export Portfolio', icon: Download, color: 'lime' }].map((action, idx) => (
                  <button key={idx} className="p-4 rounded-lg border transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 group">
                    <div className={`${action.color === 'red' ? 'bg-red-100 text-red-700' : 'bg-lime-100 text-lime-700'} w-12 h-12 mx-auto mb-3 rounded-lg flex items-center justify-center`}>
                      <action.icon size={24} />
                    </div>
                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{action.label}</div>
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
