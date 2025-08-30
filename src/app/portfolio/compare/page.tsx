"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Account = { id: string; name: string };
type CompResp = {
  portfolio: { cash: number; totalValue: number; totalCost: number; totalPnl: number; totalPnlPct?: number; positions: Array<{ symbol: string; qty: number; price?: number; value?: number; cost: number; ror?: number }>; };
  benchmark: { name: string; tickers: string[]; avgPrice: number };
};

export default function ComparePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [comp, setComp] = useState<CompResp | null>(null);
  const [loading, setLoading] = useState(false);

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

  async function runCompare() {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/portfolio/compare?accountId=${encodeURIComponent(accountId)}`);
      const j = await res.json();
      setComp(j);
    } finally {
      setLoading(false);
    }
  }

  const posCount = comp?.portfolio.positions.length || 0;
  const topMovers = useMemo(() => (comp?.portfolio.positions || [])
    .filter((p) => typeof p.ror === "number")
    .sort((a, b) => (b.ror! - a.ror!))
    .slice(0, 5), [comp]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Portfolio vs Top 30</h1>

      <Card className="rounded-2xl">
        <CardContent className="p-5">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-6 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">Account</label>
              <select className="border rounded px-3 py-2" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4" />
            <div>
              <Button onClick={runCompare} disabled={!accountId || loading}>{loading ? "Comparing..." : "Compare"}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {comp && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <h2 className="text-lg font-medium">Summary</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Positions</div>
                  <div className="text-lg font-semibold">{posCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Cash</div>
                  <div className="text-lg font-semibold">${comp.portfolio.cash.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total Value</div>
                  <div className="text-lg font-semibold">${comp.portfolio.totalValue.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">P&L</div>
                  <div className={`text-lg font-semibold ${comp.portfolio.totalPnl >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {comp.portfolio.totalPnl >= 0 ? "+" : ""}${comp.portfolio.totalPnl.toFixed(2)} {comp.portfolio.totalPnlPct != null ? `(${comp.portfolio.totalPnlPct.toFixed(2)}%)` : ""}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <h2 className="text-lg font-medium">Benchmark</h2>
              <div className="mt-2 text-sm text-muted-foreground">{comp.benchmark.name}</div>
              <div className="mt-2 text-sm">Avg Price (Top 30, EW): ${comp.benchmark.avgPrice.toFixed(2)}</div>
              <div className="mt-3 text-xs text-muted-foreground">Tickers: {comp.benchmark.tickers.join(", ")}</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl lg:col-span-2">
            <CardContent className="p-5">
              <h2 className="text-lg font-medium">Top Movers (ROR)</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2">Symbol</th>
                      <th className="py-2">Qty</th>
                      <th className="py-2">Price</th>
                      <th className="py-2">Value</th>
                      <th className="py-2">ROR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topMovers.map((p) => (
                      <tr key={p.symbol} className="border-t">
                        <td className="py-2">{p.symbol}</td>
                        <td className="py-2">{p.qty}</td>
                        <td className="py-2">{p.price != null ? `$${p.price.toFixed(2)}` : "—"}</td>
                        <td className="py-2">{p.value != null ? `$${p.value.toFixed(2)}` : "—"}</td>
                        <td className={`py-2 ${p.ror != null ? (p.ror >= 0 ? "text-emerald-600" : "text-red-600") : ""}`}>{p.ror != null ? `${p.ror.toFixed(2)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
