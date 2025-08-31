"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { 
  Upload, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart,
  AlertCircle,
  CheckCircle,
  Activity,
  BarChart3
} from "lucide-react";

type Account = { id: string; name: string };
type Position = { symbol: string; qty: number; avg: number; cost: number; price?: number; value?: number; pnl?: number; pnlPct?: number };

// StatCard Component
const StatCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon: Icon,
  prefix = '',
  suffix = ''
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  prefix?: string;
  suffix?: string;
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-emerald-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">
                {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
              </p>
              {change && (
                <p className={`text-sm ${getChangeColor()}`}>
                  {change}
                </p>
              )}
            </div>
          </div>
          <div className="p-3 bg-emerald-100 rounded-full">
            <Icon className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function ImportPortfolioPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [created, setCreated] = useState<number | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [equityCurve, setEquityCurve] = useState<{ t: string; v: number }[]>([]);

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((j) => {
      const list: Account[] = j.data || [];
      if (list.length === 0) {
        fetch("/api/accounts", { method: "POST" }).then((r) => r.json()).then((k) => {
          setAccounts([k.data]);
          setAccountId(k.data.id);
        });
      } else {
        setAccounts(list);
        setAccountId(list[0].id);
      }
    });
  }, []);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !accountId) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("accountId", accountId);
    const res = await fetch("/api/import/transactions", { method: "POST", body: fd });
    const j = await res.json();
    setCreated(j.created ?? 0);
    await buildPositions();
  }

  async function buildPositions() {
    // Fetch transactions and quotes; compute simple FIFO and current valuation client-side for now
    const tx = await fetch("/api/transactions").then((r) => r.json() as Promise<{ data: {
      id: string; accountId: string; symbol?: string | null; type: string; qty: number | null; price: number | null; tradeDate: string;
    }[] }>);
    const txns = (tx.data || []).filter((t) => t.accountId === accountId);
    const bySymbol: Record<string, { type: "BUY" | "SELL"; qty: number; price: number }[]> = {};
    for (const t of txns) {
      const sym = (t.symbol || "").toString();
      if (!sym) continue;
      bySymbol[sym] ||= [];
      if (t.type === "BUY" || t.type === "SELL") bySymbol[sym].push({ type: t.type, qty: Number(t.qty || 0), price: Number(t.price || 0) });
    }
    const syms = Object.keys(bySymbol).filter(Boolean);
    // Get prices
    let quotes: Record<string, { price: number }> = {};
    if (syms.length) {
      const q = await fetch(`/api/quotes?symbols=${encodeURIComponent(syms.join(","))}`).then((r) => r.json()).catch(() => ({ data: {} }));
      quotes = q.data || {};
    }
    const pos: Position[] = syms.map((s) => {
      // simple FIFO avg
      let remaining = 0;
      let totalCost = 0;
      for (const t of bySymbol[s]) {
        if (t.type === "BUY") { remaining += t.qty || 0; totalCost += (t.qty || 0) * (t.price || 0); }
        if (t.type === "SELL") { remaining -= t.qty || 0; /* reduce cost proportionally */ totalCost = Math.max(0, totalCost - (t.qty || 0) * (t.price || 0)); }
      }
      const avg = remaining > 0 ? totalCost / remaining : 0;
      const price = quotes[s]?.price;
      const value = price != null ? remaining * price : undefined;
      const pnl = value != null ? value - totalCost : undefined;
      const pnlPct = pnl != null && totalCost > 0 ? (pnl / totalCost) * 100 : undefined;
      return { symbol: s, qty: remaining, avg, cost: totalCost, price, value, pnl, pnlPct };
    });
    setPositions(pos);
    // Placeholder equity curve: sum of values; in a real flow we’d compute over time from historical prices
    const today = new Date();
    const arr = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (29 - i));
      const v = pos.reduce((sum, p) => sum + (p.value ?? 0), 0) * (1 + Math.sin(i / 7) * 0.01);
      return { t: d.toISOString().slice(0, 10), v };
    });
    setEquityCurve(arr);
  }

  const totalValue = useMemo(() => positions.reduce((s, p) => s + (p.value ?? 0), 0), [positions]);
  const totalCost = useMemo(() => positions.reduce((s, p) => s + p.cost, 0), [positions]);
  const totalPnl = useMemo(() => totalValue - totalCost, [totalValue, totalCost]);
  const totalPnlPct = useMemo(() => totalCost > 0 ? (totalPnl / totalCost) * 100 : 0, [totalPnl, totalCost]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Import Portfolio</h1>
          <p className="text-gray-600">Upload your transaction data to track your portfolio performance</p>
        </div>

        {/* Upload Section */}
        <Card className="mb-8 bg-gradient-to-br from-emerald-50 to-green-50 border-0 shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Upload className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Upload Transaction Data</h2>
            </div>
            
            <form className="grid gap-6 md:grid-cols-6 items-end" onSubmit={upload}>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">Select Account</label>
                <select 
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200" 
                  value={accountId} 
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="md:col-span-3 space-y-2">
                <label className="text-sm font-medium text-gray-700">Transaction CSV File</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)} 
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" 
                  />
                </div>
              </div>
              
              <div className="md:col-span-1">
                <Button 
                  type="submit" 
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm"
                  disabled={!file || !accountId}
                >
                  Import
                </Button>
              </div>
            </form>
            
            {created != null && (
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">
                  Successfully imported {created} transactions
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Portfolio Overview Stats */}
        {positions.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Portfolio Value"
                value={totalValue.toFixed(2)}
                prefix="$"
                icon={DollarSign}
              />
              <StatCard
                title="Total Cost Basis"
                value={totalCost.toFixed(2)}
                prefix="$"
                icon={BarChart3}
              />
              <StatCard
                title="Total P&L"
                value={Math.abs(totalPnl).toFixed(2)}
                prefix={totalPnl >= 0 ? "+$" : "-$"}
                change={`${totalPnlPct >= 0 ? "+" : ""}${totalPnlPct.toFixed(2)}%`}
                changeType={totalPnl >= 0 ? 'positive' : 'negative'}
                icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
              />
              <StatCard
                title="Total Positions"
                value={positions.length}
                icon={PieChart}
              />
            </div>

            {/* Portfolio Performance Chart */}
            <Card className="mb-8 bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-sm">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Activity className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Portfolio Performance</h2>
                </div>
                
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={equityCurve} margin={{ left: 12, right: 12, top: 20, bottom: 20 }}>
                      <XAxis 
                        dataKey="t" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        domain={["auto", "auto"]} 
                      />
                      <Tooltip 
                        formatter={(v: number | string) => [`$${Number(v).toFixed(2)}`, 'Portfolio Value']} 
                        labelFormatter={(l) => `Date: ${l}`}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="v" 
                        stroke="#10B981" 
                        strokeWidth={3} 
                        dot={false}
                        strokeLinecap="round"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Positions Table */}
        {positions.length > 0 && (
            <Card className="bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-sm">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <FileText className="h-5 w-5 text-emerald-600" />
                  </div>
                <h2 className="text-xl font-semibold text-gray-900">Current Holdings</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 px-2 text-sm font-semibold text-gray-700">Symbol</th>
                      <th className="text-right py-4 px-2 text-sm font-semibold text-gray-700">Quantity</th>
                      <th className="text-right py-4 px-2 text-sm font-semibold text-gray-700">Avg Cost</th>
                      <th className="text-right py-4 px-2 text-sm font-semibold text-gray-700">Total Cost</th>
                      <th className="text-right py-4 px-2 text-sm font-semibold text-gray-700">Current Price</th>
                      <th className="text-right py-4 px-2 text-sm font-semibold text-gray-700">Market Value</th>
                      <th className="text-right py-4 px-2 text-sm font-semibold text-gray-700">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((position, index) => (
                      <tr key={position.symbol} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'} hover:bg-emerald-50/50 transition-colors duration-200`}>
                        <td className="py-4 px-2">
                          <div className="font-semibold text-gray-900">{position.symbol}</div>
                        </td>
                        <td className="py-4 px-2 text-right text-gray-700">
                          {position.qty.toLocaleString()}
                        </td>
                        <td className="py-4 px-2 text-right text-gray-700">
                          ${position.avg.toFixed(2)}
                        </td>
                        <td className="py-4 px-2 text-right text-gray-700">
                          ${position.cost.toFixed(2)}
                        </td>
                        <td className="py-4 px-2 text-right text-gray-700">
                          {position.price != null ? `$${position.price.toFixed(2)}` : (
                            <span className="text-gray-400 flex items-center justify-end gap-1">
                              <AlertCircle className="h-3 w-3" />
                              N/A
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-2 text-right text-gray-700">
                          {position.value != null ? `$${position.value.toFixed(2)}` : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-2 text-right">
                          {position.pnl != null ? (
                            <div className="flex items-center justify-end gap-1">
                              {position.pnl >= 0 ? (
                                <TrendingUp className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-red-600" />
                              )}
                              <span className={position.pnl >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                                {position.pnl >= 0 ? "+" : ""}${position.pnl.toFixed(2)}
                                <br />
                                <span className="text-xs">
                                  ({(position.pnlPct ?? 0).toFixed(2)}%)
                                </span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
