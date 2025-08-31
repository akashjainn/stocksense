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
    <Card className="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-400">{title}</p>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white">
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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(true);

  useEffect(() => {
    setAccountsLoading(true);
    setError(null);
  fetch("/api/accounts")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load accounts (${r.status})`);
        return r.json();
      })
      .then(async (j) => {
        const list: Account[] = j.data || [];
        if (list.length === 0) {
          const res = await fetch("/api/accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "My Portfolio" }),
          });
          if (!res.ok) throw new Error(`Failed to create account (${res.status})`);
          const k = await res.json();
          setAccounts([k.data]);
          setAccountId(k.data.id);
          await buildPositions(k.data.id);
        } else {
          setAccounts(list);
          setAccountId(list[0].id);
          await buildPositions(list[0].id);
        }
      })
      .catch(async (e) => {
        // Try one more time in case the DB was just created
        await new Promise((r) => setTimeout(r, 200));
        try {
          const r = await fetch("/api/accounts");
          if (!r.ok) throw new Error(`Failed to load accounts (${r.status})`);
          const j = await r.json();
          const list: Account[] = j.data || [];
          if (list.length > 0) {
            setAccounts(list);
            setAccountId(list[0].id);
            await buildPositions(list[0].id);
            return;
          }
        } catch {}
        setError(e instanceof Error ? e.message : "Failed to initialize accounts");
      })
      .finally(() => setAccountsLoading(false));
  }, []);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file || !accountId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("accountId", accountId);
      const res = await fetch("/api/import/transactions", { method: "POST", body: fd });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Import failed (${res.status})`);
      }
      const j = await res.json();
      setCreated(j.created ?? 0);
      await buildPositions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  }

  async function buildPositions(id?: string) {
    // Prefer server-side computation for positions and equity curve for accuracy
    try {
  const acct = id ?? accountId;
  if (!acct) return;
  const res = await fetch(`/api/portfolio?accountId=${encodeURIComponent(acct)}`);
      if (!res.ok) throw new Error(`Failed to load portfolio: ${res.status}`);
      const data = await res.json() as {
        positions: Array<{ symbol: string; qty: number; cost: number; price?: number; value?: number; pnl?: number; pnlPct?: number }>;
        equityCurve: { t: string; v: number }[];
      };
      const pos: Position[] = (data.positions || []).map(p => ({
        symbol: p.symbol,
        qty: p.qty,
        cost: p.cost,
        avg: p.qty > 0 ? p.cost / p.qty : 0,
        price: p.price,
        value: p.value,
        pnl: p.pnl,
        pnlPct: p.pnlPct,
      }));
      setPositions(pos);
      setEquityCurve(data.equityCurve || []);
    } catch (e) {
      // Fallback to empty state on error
      setPositions([]);
      setEquityCurve([]);
    }
  }

  const totalValue = useMemo(() => positions.reduce((s, p) => s + (p.value ?? 0), 0), [positions]);
  const totalCost = useMemo(() => positions.reduce((s, p) => s + p.cost, 0), [positions]);
  const totalPnl = useMemo(() => totalValue - totalCost, [totalValue, totalCost]);
  const totalPnlPct = useMemo(() => totalCost > 0 ? (totalPnl / totalCost) * 100 : 0, [totalPnl, totalCost]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Import Portfolio</h1>
          <p className="text-neutral-400">Upload your transaction data to track your portfolio performance</p>
        </div>

        {/* Upload Section */}
        <Card className="mb-8 bg-gradient-to-br from-emerald-950/20 to-green-950/20 border border-emerald-800/20 shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Upload className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-white">Upload Transaction Data</h2>
            </div>
            
            <form className="grid gap-6 md:grid-cols-6 items-end" onSubmit={upload}>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-neutral-300">Select Account</label>
                <select 
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-white disabled:opacity-60" 
                  value={accountId} 
                  onChange={async (e) => { const id = e.target.value; setAccountId(id); await buildPositions(id); }}
                  disabled={accountsLoading || accounts.length === 0}
                >
                  {accounts.length === 0 ? (
                    <option value="">{accountsLoading ? "Loading accounts…" : "No account"}</option>
                  ) : (
                    accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))
                  )}
                </select>
                {!accountsLoading && accounts.length === 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-md text-sm"
                      onClick={async () => {
                        setError(null);
                        try {
                          const res = await fetch('/api/accounts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: 'My Portfolio' }),
                          });
                          if (!res.ok) throw new Error(`Create account failed (${res.status})`);
                          const j = await res.json();
                          setAccounts([j.data]);
                          setAccountId(j.data.id);
                          await buildPositions(j.data.id);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Failed to create account');
                        }
                      }}
                    >
                      Create Account
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="md:col-span-3 space-y-2">
                <label className="text-sm font-medium text-neutral-300">Transaction CSV File</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)} 
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 text-white" 
                  />
                </div>
              </div>
              
              <div className="md:col-span-1">
                <Button 
                  type="submit" 
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={!file || !accountId || uploading || accountsLoading}
                >
                  {uploading ? "Importing…" : "Import"}
                </Button>
              </div>
            </form>

            {!accountId && !accountsLoading && (
              <div className="mt-3 text-sm text-neutral-400">Create or select an account to enable importing.</div>
            )}
            
            {error && (
              <div className="mt-6 p-4 bg-red-950/50 border border-red-700/50 rounded-lg flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <span className="text-sm font-medium text-red-300">{error}</span>
              </div>
            )}

            {created != null && (
              <div className="mt-6 p-4 bg-emerald-950/50 border border-emerald-700/50 rounded-lg flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-300">
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
            <Card className="mb-8 bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 shadow-sm">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Activity className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Portfolio Performance</h2>
                </div>
                
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={equityCurve} margin={{ left: 12, right: 12, top: 20, bottom: 20 }}>
                      <XAxis 
                        dataKey="t" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#9CA3AF' }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#9CA3AF' }}
                        domain={["auto", "auto"]} 
                      />
                      <Tooltip 
                        formatter={(v: number | string) => [`$${Number(v).toFixed(2)}`, 'Portfolio Value']} 
                        labelFormatter={(l) => `Date: ${l}`}
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          color: '#F9FAFB'
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
          <Card className="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 shadow-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <FileText className="h-5 w-5 text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold text-white">Current Holdings</h2>
              </div>              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-700">
                      <th className="text-left py-4 px-2 text-sm font-semibold text-neutral-300">Symbol</th>
                      <th className="text-right py-4 px-2 text-sm font-semibold text-neutral-300">Quantity</th>
                      <th className="text-right py-4 px-2 text-sm font-semibold text-neutral-300">Avg Cost</th>
                      <th className="text-right py-4 px-2 text-sm font-semibold text-neutral-300">Total Cost</th>
                      <th className="text-right py-4 px-2 text-sm font-semibold text-neutral-300">Current Price</th>
                      <th className="text-right py-4 px-2 text-sm font-semibold text-neutral-300">Market Value</th>
                      <th className="text-right py-4 px-2 text-sm font-semibold text-neutral-300">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((position, index) => (
                      <tr key={position.symbol} className={`border-b border-neutral-700 ${index % 2 === 0 ? 'bg-neutral-800/50' : 'bg-neutral-900/50'} hover:bg-emerald-950/30 transition-colors duration-200`}>
                        <td className="py-4 px-2">
                          <div className="font-semibold text-white">{position.symbol}</div>
                        </td>
                        <td className="py-4 px-2 text-right text-neutral-300">
                          {position.qty.toLocaleString()}
                        </td>
                        <td className="py-4 px-2 text-right text-neutral-300">
                          ${position.avg.toFixed(2)}
                        </td>
                        <td className="py-4 px-2 text-right text-neutral-300">
                          ${position.cost.toFixed(2)}
                        </td>
                        <td className="py-4 px-2 text-right text-neutral-300">
                          {position.price != null ? `$${position.price.toFixed(2)}` : (
                            <span className="text-neutral-500 flex items-center justify-end gap-1">
                              <AlertCircle className="h-3 w-3" />
                              N/A
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-2 text-right text-neutral-300">
                          {position.value != null ? `$${position.value.toFixed(2)}` : (
                            <span className="text-neutral-500">—</span>
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
                              <span className={position.pnl >= 0 ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>
                                {position.pnl >= 0 ? "+" : ""}${position.pnl.toFixed(2)}
                                <br />
                                <span className="text-xs">
                                  ({(position.pnlPct ?? 0).toFixed(2)}%)
                                </span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-neutral-500">—</span>
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
