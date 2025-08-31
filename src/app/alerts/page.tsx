"use client";
import { useState } from "react";
import { 
  Bell, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Target,
  AlertTriangle,
  CheckCircle,
  Settings,
  Filter
} from "lucide-react";

type Alert = {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  targetPrice: number;
  currentPrice?: number;
  status: 'active' | 'triggered' | 'paused';
  createdAt: string;
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      symbol: 'AAPL',
      condition: 'above',
      targetPrice: 200,
      currentPrice: 195.50,
      status: 'active',
      createdAt: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      symbol: 'MSFT',
      condition: 'below',
      targetPrice: 350,
      currentPrice: 368.25,
      status: 'active',
      createdAt: '2024-01-14T14:20:00Z'
    },
    {
      id: '3',
      symbol: 'GOOGL',
      condition: 'above',
      targetPrice: 145,
      currentPrice: 148.30,
      status: 'triggered',
      createdAt: '2024-01-13T09:15:00Z'
    }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [newAlert, setNewAlert] = useState({
    symbol: '',
    condition: 'above' as 'above' | 'below',
    targetPrice: ''
  });

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend = 'neutral',
    subtitle
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ComponentType<{ size?: number; className?: string }>; 
    trend?: 'up' | 'down' | 'neutral';
    subtitle?: string;
  }) => (
    <div className="group relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 transition-all duration-300 hover:shadow-medium hover:-translate-y-1">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-soft transition-transform duration-300 group-hover:scale-110 ${
          trend === 'down' ? 'from-red-500 to-red-600' : trend === 'up' ? 'from-emerald-500 to-emerald-600' : 'from-blue-500 to-blue-600'
        }`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>

      <div className="space-y-1 mt-4">
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{title}</p>
        <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">{value}</p>
        {subtitle && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>
        )}
      </div>
    </div>
  );

  const activeAlerts = alerts.filter(a => a.status === 'active').length;
  const triggeredAlerts = alerts.filter(a => a.status === 'triggered').length;

  const handleAddAlert = () => {
    if (!newAlert.symbol || !newAlert.targetPrice) return;
    
    const alert: Alert = {
      id: Date.now().toString(),
      symbol: newAlert.symbol.toUpperCase(),
      condition: newAlert.condition,
      targetPrice: parseFloat(newAlert.targetPrice),
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    setAlerts(prev => [...prev, alert]);
    setNewAlert({ symbol: '', condition: 'above', targetPrice: '' });
    setShowForm(false);
  };

  const toggleAlertStatus = (id: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id 
        ? { ...alert, status: alert.status === 'active' ? 'paused' : 'active' }
        : alert
    ));
  };

  const deleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  return (
    <div className="h-full bg-neutral-50 dark:bg-neutral-950 p-6">
      <div className="max-w-[1400px] mx-auto h-full">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
              Price Alerts
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Get notified when stocks reach your target prices
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Total Alerts" 
              value={alerts.length}
              icon={Bell} 
              trend="neutral"
              subtitle="configured"
            />
            <StatCard 
              title="Active Alerts" 
              value={activeAlerts}
              icon={Target} 
              trend="up"
              subtitle="monitoring"
            />
            <StatCard 
              title="Triggered" 
              value={triggeredAlerts}
              icon={AlertTriangle} 
              trend={triggeredAlerts > 0 ? "down" : "neutral"}
              subtitle="need attention"
            />
            <StatCard 
              title="Success Rate" 
              value={alerts.length > 0 ? `${Math.round((triggeredAlerts / alerts.length) * 100)}%` : "—"}
              icon={CheckCircle} 
              trend="up"
              subtitle="alert accuracy"
            />
          </div>

          {/* Create Alert Form */}
          {showForm && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                    Create New Alert
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Set up a price alert for any stock symbol
                  </p>
                </div>
                <Plus className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              
              <div className="grid gap-6 grid-cols-1 md:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Symbol</label>
                  <input 
                    className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                    placeholder="AAPL"
                    value={newAlert.symbol}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, symbol: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Condition</label>
                  <select 
                    className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                    value={newAlert.condition}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, condition: e.target.value as 'above' | 'below' }))}
                  >
                    <option value="above">Above</option>
                    <option value="below">Below</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Target Price</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                    placeholder="150.00"
                    value={newAlert.targetPrice}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, targetPrice: e.target.value }))}
                  />
                </div>
                
                <div className="flex items-end gap-2">
                  <button
                    onClick={handleAddAlert}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Create Alert
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Alerts List */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                  Your Alerts
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Manage and monitor your price alerts
                </p>
              </div>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Alert
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="pb-3 font-medium">Symbol</th>
                    <th className="pb-3 font-medium">Condition</th>
                    <th className="pb-3 font-medium">Target Price</th>
                    <th className="pb-3 font-medium">Current Price</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Created</th>
                    <th className="pb-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-500 dark:text-neutral-400">
                        No alerts configured yet. Create your first alert to get started.
                      </td>
                    </tr>
                  )}
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-50">{alert.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                          alert.condition === 'above' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {alert.condition === 'above' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {alert.condition}
                        </div>
                      </td>
                      <td className="py-4 font-medium text-neutral-900 dark:text-neutral-50">
                        ${alert.targetPrice.toFixed(2)}
                      </td>
                      <td className="py-4 text-neutral-600 dark:text-neutral-400">
                        {alert.currentPrice ? `$${alert.currentPrice.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-4">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                          alert.status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : alert.status === 'triggered'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
                        }`}>
                          {alert.status === 'active' && <CheckCircle className="w-3 h-3" />}
                          {alert.status === 'triggered' && <AlertTriangle className="w-3 h-3" />}
                          {alert.status === 'paused' && <Settings className="w-3 h-3" />}
                          {alert.status}
                        </div>
                      </td>
                      <td className="py-4 text-neutral-600 dark:text-neutral-400">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => toggleAlertStatus(alert.id)}
                            className="px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-xs"
                          >
                            {alert.status === 'active' ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            onClick={() => deleteAlert(alert.id)}
                            className="px-2 py-1 rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
