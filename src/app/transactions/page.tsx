"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Plus, 
  DollarSign, 
  Activity,
  Calendar,
  Building2,
  RefreshCw,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

type Account = { id: string; name: string };
type Txn = { id: string; accountId: string; securityId?: string | null; type: string; qty?: number | null; price?: number | null; tradeDate: string };

export default function TransactionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [symbol, setSymbol] = useState("");
  const [type, setType] = useState("BUY");
  const [qty, setQty] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [tradeDate, setTradeDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [txns, setTxns] = useState<Txn[]>([]);
  const [lastPrice, setLastPrice] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((j) => {
      const list: Account[] = j.data || [];
      if (list.length === 0) {
        // autocreate an account for demo
        fetch("/api/accounts", { method: "POST" }).then((r) => r.json()).then((k) => {
          setAccounts([k.data]);
          setAccountId(k.data.id);
        });
      } else {
        setAccounts(list);
        setAccountId(list[0].id);
      }
    });
    fetch("/api/transactions").then((r) => r.json()).then((j) => setTxns(j.data || []));
  }, []);

  useEffect(() => {
    const s = symbol.trim().toUpperCase();
    if (!s) { setLastPrice(null); return; }
    const controller = new AbortController();
    fetch(`/api/quotes?symbols=${encodeURIComponent(s)}`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        const price = j?.data?.[s]?.price ?? null;
        setLastPrice(typeof price === "number" ? price : null);
      }).catch(() => {});
    return () => controller.abort();
  }, [symbol]);

  const estCost = useMemo(() => {
    const q = parseFloat(qty || "0");
    const p = parseFloat(price || (lastPrice ?? 0).toString());
    return isFinite(q * p) ? q * p : 0;
  }, [qty, price, lastPrice]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId) return;
    const body = {
      accountId,
      symbol: symbol.trim().toUpperCase() || undefined,
      type,
      qty: qty ? Number(qty) : undefined,
      price: price ? Number(price) : undefined,
      tradeDate,
    };
    const res = await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      setQty("");
      setPrice("");
      fetch("/api/transactions").then((r) => r.json()).then((j) => setTxns(j.data || []));
    }
  }

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

  return (
    <div className="h-full bg-neutral-50 dark:bg-neutral-950 p-6">
      <div className="max-w-[1400px] mx-auto h-full">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
              Transactions
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Record and manage your portfolio transactions
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Last Price" 
              value={lastPrice != null ? `$${lastPrice.toFixed(2)}` : "—"}
              icon={TrendingUp} 
              trend="up"
              subtitle={symbol ? `for ${symbol.toUpperCase()}` : "Enter symbol"}
            />
            <StatCard 
              title="Estimated Cost" 
              value={`$${estCost.toFixed(2)}`}
              icon={DollarSign} 
              trend="neutral"
              subtitle="based on current inputs"
            />
            <StatCard 
              title="Transaction Type" 
              value={type}
              icon={Activity} 
              trend={type === 'BUY' ? 'up' : type === 'SELL' ? 'down' : 'neutral'}
            />
            <StatCard 
              title="Total Transactions" 
              value={txns.length}
              icon={Building2} 
              trend="neutral"
              subtitle="recorded"
            />
          </div>

          {/* Transaction Form */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                  Add New Transaction
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Record a new buy, sell, dividend, or cash transaction
                </p>
              </div>
              <Plus className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            
            <form onSubmit={submit} className="space-y-6">
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Account</label>
                  <select 
                    className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                    value={accountId} 
                    onChange={(e) => setAccountId(e.target.value)}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Symbol</label>
                  <input 
                    className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                    placeholder="AAPL" 
                    value={symbol} 
                    onChange={(e) => setSymbol(e.target.value)} 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Type</label>
                  <select 
                    className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                  >
                    {['BUY','SELL','DIV','CASH'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Quantity</label>
                  <input 
                    type="number" 
                    step="any" 
                    className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                    value={qty} 
                    onChange={(e) => setQty(e.target.value)} 
                    placeholder="100"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Price</label>
                  <input 
                    type="number" 
                    step="any" 
                    className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    placeholder={lastPrice != null ? lastPrice.toString() : "150.00"} 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Trade Date</label>
                  <input 
                    type="date" 
                    className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                    value={tradeDate} 
                    onChange={(e) => setTradeDate(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <Button 
                  type="submit" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Add Transaction
                </Button>
              </div>
            </form>
          </div>

          {/* Transactions Table */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-1">
                  Transaction History
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  All recorded transactions for your portfolios
                </p>
              </div>
              <Calendar className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Symbol</th>
                    <th className="pb-3 font-medium">Quantity</th>
                    <th className="pb-3 font-medium">Price</th>
                    <th className="pb-3 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.slice().reverse().map((t) => {
                    const value = (t.qty && t.price) ? t.qty * t.price : null;
                    return (
                      <tr key={t.id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                        <td className="py-4">
                          <div className="text-neutral-900 dark:text-neutral-50 font-medium">
                            {new Date(t.tradeDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                            t.type === 'BUY' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            t.type === 'SELL' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
                          }`}>
                            {t.type === 'BUY' && <ArrowUpRight className="w-3 h-3" />}
                            {t.type === 'SELL' && <ArrowDownRight className="w-3 h-3" />}
                            {t.type}
                          </div>
                        </td>
                        <td className="py-4 text-neutral-900 dark:text-neutral-50 font-medium">
                          {t.securityId || "—"}
                        </td>
                        <td className="py-4 text-neutral-600 dark:text-neutral-400">
                          {t.qty ?? "—"}
                        </td>
                        <td className="py-4 text-neutral-600 dark:text-neutral-400">
                          {t.price != null ? `$${t.price.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-4 text-neutral-900 dark:text-neutral-50 font-medium">
                          {value != null ? `$${value.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {txns.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-500 dark:text-neutral-400">
                        No transactions recorded yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
