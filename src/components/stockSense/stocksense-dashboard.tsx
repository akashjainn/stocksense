"use client";
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Briefcase, Activity, Plus, Search, Bell, Settings, User, Menu, X, Sun, Moon, BarChart3, Target, Calendar, Filter, RefreshCw, Download, Upload } from 'lucide-react';

type Theme = 'dark' | 'light';
type View = 'dashboard' | 'portfolio' | 'analytics' | 'transactions' | 'watchlist' | 'calendar';
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
  date: string; // ISO date
  total: number;
}

const StockSenseDashboard = () => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<View>('dashboard');
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

  const allocationData = portfolioData.positions.map((pos, index) => ({
    name: pos.symbol,
    value: pos.value,
    percentage: ((pos.value / portfolioData.totalValue) * 100).toFixed(1),
    color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'][index],
  }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const handleRefresh = async () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); };

  const StatCard = ({ title, value, change, changePercent, icon: Icon, trend, subtitle }:
    { title: string; value: string | number; change?: string | number; changePercent?: number; icon: IconType; trend?: 'up' | 'down'; subtitle?: string }) => (
    <div className={`group p-6 rounded-xl border transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
      theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border-gray-700 hover:border-gray-600' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg transition-colors ${
          trend === 'up' ? 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200' : trend === 'down' ? 'bg-red-100 text-red-600 group-hover:bg-red-200' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200'
        }`}>
          <Icon size={24} />
        </div>
        <div className="flex items-center space-x-1">
          {trend === 'up' ? <TrendingUp size={16} className="text-emerald-500" /> : trend === 'down' ? <TrendingDown size={16} className="text-red-500" /> : null}
          <span className={`text-sm font-semibold ${
            trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'
          }`}>
            {changePercent ? `${changePercent > 0 ? '+' : ''}${changePercent}%` : ''}
          </span>
        </div>
      </div>
      <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{title}</div>
      <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>{value}</div>
      {change && (
        <div className={`text-sm font-medium ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend === 'up' ? '+' : ''}{change} {subtitle}
        </div>
      )}
    </div>
  );

  const PositionRow = ({ position }:{ position: Position }) => {
    const totalGainLoss = (position.price - position.avgCost) * position.shares;
    const gainLossPercent = ((position.price - position.avgCost) / position.avgCost) * 100;
    return (
      <div className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${
        theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-800/80 border-gray-700 hover:border-gray-600' : 'bg-gradient-to-r from-white to-gray-50 border-gray-200 hover:border-gray-300'
      }`}>
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${position.change > 0 ? 'from-emerald-400 to-emerald-600' : 'from-red-400 to-red-600'} flex items-center justify-center shadow-lg`}>
            <span className="text-white font-bold">{position.symbol.charAt(0)}</span>
          </div>
          <div>
            <div className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{position.symbol}</div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{position.name}</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{position.shares} shares @ ${position.price.toFixed(2)}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>${position.value.toLocaleString()}</div>
          <div className={`text-sm font-medium ${totalGainLoss >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toFixed(2)} ({gainLossPercent.toFixed(1)}%)</div>
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Avg cost: ${position.avgCost.toFixed(2)}</div>
        </div>
        <div className={`text-right min-w-[80px] ${position.change > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          <div className="font-semibold">{position.change > 0 ? '+' : ''}{position.change}%</div>
          <div className="text-xs">Today</div>
        </div>
      </div>
    );
  };

  const TransactionRow = ({ transaction }:{ transaction: Transaction }) => (
    <div className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${transaction.type === 'BUY' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>{transaction.type === 'BUY' ? '↑' : '↓'}</div>
        <div>
          <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{transaction.type} {transaction.shares} {transaction.symbol}</div>
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{transaction.date} @ ${transaction.price}</div>
        </div>
      </div>
      <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>${transaction.total.toLocaleString()}</div>
    </div>
  );

  const Sidebar = () => (
    <div className={`fixed left-0 top-0 h-full transition-all duration-300 z-40 ${sidebarOpen ? 'w-64' : 'w-16'} ${theme === 'dark' ? 'bg-gradient-to-b from-gray-900 to-gray-800 border-r border-gray-700' : 'bg-gradient-to-b from-white to-gray-50 border-r border-gray-200'} shadow-xl`}>
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <BarChart3 className="text-white" size={22} />
          </div>
          {sidebarOpen && (
            <div>
              <span className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>StockSense</span>
              <div className="text-xs text-blue-500 font-medium">Enterprise</div>
            </div>
          )}
        </div>
        <nav className="space-y-2">
          {([
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
            { id: 'analytics', label: 'Analytics', icon: Activity },
            { id: 'transactions', label: 'Transactions', icon: DollarSign },
            { id: 'watchlist', label: 'Watchlist', icon: Target },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
          ] as Array<{ id: View; label: string; icon: IconType }>).map((item) => (
            <button key={item.id} onClick={() => setActiveView(item.id)} className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 group ${
              activeView === item.id ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105' : theme === 'dark' ? 'text-gray-300 hover:bg-gray-800 hover:text-white hover:scale-105' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:scale-105'
            }`}>
              <item.icon size={20} className="group-hover:animate-pulse" />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );

  const Header = () => (
    <header className={`fixed top-0 right-0 left-0 z-30 transition-all duration-300 ${sidebarOpen ? 'pl-64' : 'pl-16'} ${theme === 'dark' ? 'bg-gray-900/95 border-b border-gray-700' : 'bg-white/95 border-b border-gray-200'} backdrop-blur-sm shadow-sm`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>{sidebarOpen ? <X size={20} /> : <Menu size={20} />}</button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Search stocks, transactions..." className={`pl-10 pr-4 py-2 w-96 rounded-lg border transition-all duration-200 focus:scale-105 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'} focus:outline-none focus:ring-2 focus:ring-blue-500/20`} />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={handleRefresh} className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} ${refreshing ? 'animate-spin' : ''}`}><RefreshCw size={20} /></button>
          <button onClick={toggleTheme} className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
          <button className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}><Bell size={20} /></button>
          <button className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}><Settings size={20} /></button>
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"><User className="text-white" size={18} /></div>
        </div>
      </div>
    </header>
  );

  return (
    <div className={`min-h-screen transition-all duration-300 ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'}`}>
      <Sidebar />
      <Header />
      <main className={`transition-all duration-300 pt-20 p-6 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        {activeView === 'dashboard' && (
          <div className="space-y-6">
            <div className={`p-6 rounded-xl ${theme === 'dark' ? 'bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-800/30' : 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50'}`}>
              <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>Good morning! Welcome back to your portfolio</h1>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Here&apos;s what&apos;s happening with your investments today</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Portfolio Value" value={`$${portfolioData.totalValue.toLocaleString()}`} change={`$${portfolioData.dayChange.toLocaleString()}`} changePercent={portfolioData.dayChangePercent} icon={DollarSign} trend="up" subtitle="today" />
              <StatCard title="Total Gain/Loss" value={`$${portfolioData.totalGainLoss.toLocaleString()}`} changePercent={portfolioData.totalGainLossPercent} icon={TrendingUp} trend="up" subtitle="all time" />
              <StatCard title="Active Positions" value={portfolioData.positions.length} icon={Briefcase} subtitle="holdings" />
              <StatCard title="Buying Power" value="$12,350.00" icon={Activity} subtitle="available" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`lg:col-span-2 p-6 rounded-xl border ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} shadow-lg`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Portfolio Performance</h2>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">6M</button>
                    <button className={`px-3 py-1 text-sm rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>1Y</button>
                    <button className={`px-3 py-1 text-sm rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>All</button>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                      <XAxis dataKey="date" stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                      <YAxis stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                      <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF', border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`, borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                      <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }} />
                      <Line type="monotone" dataKey="benchmark" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} shadow-lg`}>
                <h2 className={`text-xl font-semibold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Asset Allocation</h2>
                <div className="h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocationData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
                        {allocationData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF', border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`, borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {allocationData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{item.name}</span>
                      </div>
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`lg:col-span-2 p-6 rounded-xl border ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} shadow-lg`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Your Holdings</h2>
                  <div className="flex space-x-2">
                    <button className={`px-4 py-2 rounded-lg border transition-colors hover:scale-105 ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}><Filter size={16} className="inline mr-2" />Filter</button>
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:scale-105 shadow-lg"><Plus size={16} className="inline mr-2" />Add Position</button>
                  </div>
                </div>
                <div className="space-y-4">{portfolioData.positions.map((position, index) => (<PositionRow key={index} position={position} />))}</div>
              </div>
              <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} shadow-lg`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Recent Activity</h2>
                  <button className={`text-blue-500 hover:text-blue-600 text-sm font-medium`}>View All</button>
                </div>
                <div className="space-y-3">{portfolioData.recentTransactions.map((transaction) => (<TransactionRow key={transaction.id} transaction={transaction} />))}</div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button className="w-full py-2 text-blue-500 hover:text-blue-600 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">View Transaction History</button>
                </div>
              </div>
            </div>
            <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} shadow-lg`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Market Overview</h2>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Market Open</span>
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
                  <div key={idx} className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{index.name}</div>
                    <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{index.value}</div>
                    <div className={`text-sm font-medium ${index.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>{index.change}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} shadow-lg`}>
              <h2 className={`text-xl font-semibold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[{ label: 'Buy Stock', icon: Plus, color: 'emerald' },{ label: 'Sell Stock', icon: TrendingDown, color: 'red' },{ label: 'Import Data', icon: Upload, color: 'blue' },{ label: 'Export Portfolio', icon: Download, color: 'purple' }].map((action, idx) => (
                  <button key={idx} className={`p-4 rounded-lg border transition-all duration-200 hover:scale-105 hover:shadow-lg group ${theme === 'dark' ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-200 hover:bg-white'}`}>
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-lg flex items-center justify-center transition-colors ${action.color === 'emerald' ? 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200' : action.color === 'red' ? 'bg-red-100 text-red-600 group-hover:bg-red-200' : action.color === 'blue' ? 'bg-blue-100 text-blue-600 group-hover:bg-blue-200' : 'bg-purple-100 text-purple-600 group-hover:bg-purple-200'}`}>
                      <action.icon size={24} />
                    </div>
                    <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{action.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {activeView === 'portfolio' && (
          <div className="space-y-6">
            <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} shadow-lg`}>
              <h1 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Portfolio Analysis</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Performance Metrics</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Beta', value: '1.12', description: 'vs S&P 500' },
                      { label: 'Sharpe Ratio', value: '1.45', description: 'Risk-adjusted return' },
                      { label: 'Alpha', value: '+3.2%', description: 'Excess return' },
                      { label: 'Max Drawdown', value: '-8.7%', description: 'Worst decline' },
                    ].map((metric, idx) => (
                      <div key={idx} className={`flex justify-between items-center p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <div>
                          <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{metric.label}</div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{metric.description}</div>
                        </div>
                        <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{metric.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Sector Allocation</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ sector: 'Technology', allocation: 45, target: 40 },{ sector: 'Healthcare', allocation: 15, target: 20 },{ sector: 'Finance', allocation: 20, target: 15 },{ sector: 'Consumer', allocation: 12, target: 15 },{ sector: 'Energy', allocation: 8, target: 10 }]}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                        <XAxis dataKey="sector" stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                        <YAxis stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                        <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF', border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`, borderRadius: '8px' }} />
                        <Bar dataKey="allocation" fill="#3B82F6" name="Current" />
                        <Bar dataKey="target" fill="#94A3B8" name="Target" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {!['dashboard','portfolio'].includes(activeView) && (
          <div className={`text-center py-20 ${theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'} rounded-xl shadow-lg`}>
            <div className={`text-6xl mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`}>🚧</div>
            <div className={`text-2xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{activeView.charAt(0).toUpperCase() + activeView.slice(1)} View</div>
            <div className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-6`}>This section is under development. Coming soon with advanced features!</div>
            <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:scale-105 shadow-lg">Request Feature</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default StockSenseDashboard;
