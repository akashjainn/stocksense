"use client";
import { useEffect, useMemo, useState } from "react";
import { ensureAccount } from "@/lib/client/portfolio";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  Clock,
  Target,
  RefreshCw,
  BarChart3
} from "lucide-react";

type Lot = {
  id: string;
  accountId: string;
  symbol: string;
  openedAt: string;
  initialQty: number;
  currentQty: number;
  pricePerShare: number;
  feesAtOpen: number;
  notes?: string;
};

type LotSnapshot = {
  currentQty: number;
  grossCost: number;
  netPremium: number;
  effectiveBasis: number;
  effectivePricePerShare: number;
};

type BatchSnapshotItem = {
  lot: Lot;
  snapshot: LotSnapshot;
};

export default function OptionsPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, LotSnapshot>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const acct = await ensureAccount();
      const res = await fetch(`/api/lots/snapshots?accountId=${encodeURIComponent(acct.id)}`);
  const j: { data?: BatchSnapshotItem[] } = await res.json();
  const items = Array.isArray(j.data) ? j.data : [];
  const lotsOut: Lot[] = items.map((x) => x.lot);
  const snaps: Record<string, LotSnapshot> = Object.fromEntries(items.map((x) => [x.lot.id, x.snapshot]));
      setLots(lotsOut);
      setSnapshots(snaps);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load options data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totals = useMemo(() => {
    const totalValue = lots.reduce((sum, lot) => {
      const snap = snapshots[lot.id];
      return sum + (snap ? snap.effectiveBasis : lot.currentQty * lot.pricePerShare);
    }, 0);
    
    const totalPremium = Object.values(snapshots).reduce((sum, snap) => sum + snap.netPremium, 0);
    
    return { totalValue, totalPremium };
  }, [lots, snapshots]);

  if (loading) {
    return (
      <div className="h-full bg-neutral-50 dark:bg-neutral-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-emerald-600" />
          <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Loading Options Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-neutral-50 dark:bg-neutral-950 p-6">
      <div className="max-w-[1400px] mx-auto h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
              Options Dashboard
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Track covered calls, cash-secured puts, and per-lot effective pricing
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => {/* TODO: Implement create lot modal */}}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Lot
            </Button>
            <Button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Total Portfolio Value</p>
                  <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                    ${totals.totalValue.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Premium Collected</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    ${totals.totalPremium.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-400">Active Lots</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {lots.length}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Open Positions</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">0</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">Coming soon</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lots Table */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
                Stock Lots & Effective Pricing
              </h2>
              <div className="flex items-center space-x-2">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-2">
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Sell Covered Call
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2">
                  <Target className="w-4 h-4 mr-2" />
                  Sell Cash-Secured Put
                </Button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Symbol</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Quantity</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Original PPS</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Net Premium</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Effective PPS</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Savings</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot) => {
                    const snap = snapshots[lot.id];
                    const effectivePps = snap?.effectivePricePerShare ?? lot.pricePerShare;
                    const netPremium = snap?.netPremium ?? 0;
                    const savings = lot.pricePerShare - effectivePps;
                    const savingsPercent = (savings / lot.pricePerShare) * 100;
                    
                    return (
                      <tr key={lot.id} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                        <td className="py-4 px-2">
                          <div className="font-semibold text-neutral-900 dark:text-neutral-100">{lot.symbol}</div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            Opened {new Date(lot.openedAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 px-2 text-right text-neutral-700 dark:text-neutral-300">
                          {lot.currentQty.toLocaleString()}
                        </td>
                        <td className="py-4 px-2 text-right text-neutral-700 dark:text-neutral-300">
                          ${lot.pricePerShare.toFixed(4)}
                        </td>
                        <td className="py-4 px-2 text-right">
                          <span className={netPremium >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                            ${netPremium.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                          ${effectivePps.toFixed(4)}
                        </td>
                        <td className="py-4 px-2 text-right">
                          {savings > 0 ? (
                            <div className="text-emerald-600 dark:text-emerald-400">
                              <div>${savings.toFixed(4)}</div>
                              <div className="text-xs">({savingsPercent.toFixed(1)}%)</div>
                            </div>
                          ) : (
                            <span className="text-neutral-500">—</span>
                          )}
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="flex justify-end space-x-1">
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 py-1">
                              CC
                            </Button>
                            <Button className="bg-neutral-600 hover:bg-neutral-700 text-white text-xs px-2 py-1">
                              Sell
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {lots.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <div className="text-neutral-500 dark:text-neutral-400">
                          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium mb-2">No lots yet</p>
                          <p className="text-sm">Create your first lot to start tracking option premiums</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Button className="w-full justify-start bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Stock Lot
                </Button>
                <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white">
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Sell Covered Call
                </Button>
                <Button className="w-full justify-start bg-purple-600 hover:bg-purple-700 text-white">
                  <Target className="w-4 h-4 mr-2" />
                  Sell Cash-Secured Put
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
                Coming Soon
              </h3>
              <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Option expiration tracking
                </div>
                <div className="flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Monthly premium income charts
                </div>
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Greeks and volatility analysis
                </div>
                <div className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Automated assignment detection
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
