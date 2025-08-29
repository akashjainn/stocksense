"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Account = { id: string; name: string };
type Position = { symbol: string; qty: number; avg: number; cost: number; price?: number; value?: number; pnl?: number; pnlPct?: number };

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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Import Portfolio</h1>
      <Card className="rounded-2xl">
        <CardContent className="p-5">
          <form className="grid gap-4 grid-cols-1 md:grid-cols-6 items-end" onSubmit={upload}>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">Account</label>
              <select className="border rounded px-3 py-2" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4 flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">CSV File</label>
              <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="border rounded px-3 py-2" />
            </div>
            <div>
              <Button type="submit">Upload</Button>
            </div>
          </form>
          {created != null && (
            <div className="mt-4 text-sm text-muted-foreground">Imported {created} transactions.</div>
          )}
        </CardContent>
      </Card>

      {positions.length > 0 && (
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <h2 className="text-lg font-medium">Positions</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2">Symbol</th>
                    <th className="py-2">Qty</th>
                    <th className="py-2">Avg Cost</th>
                    <th className="py-2">Cost</th>
                    <th className="py-2">Price</th>
                    <th className="py-2">Value</th>
                    <th className="py-2">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => (
                    <tr key={p.symbol} className="border-t">
                      <td className="py-2">{p.symbol}</td>
                      <td className="py-2">{p.qty.toLocaleString()}</td>
                      <td className="py-2">${p.avg.toFixed(2)}</td>
                      <td className="py-2">${p.cost.toFixed(2)}</td>
                      <td className="py-2">{p.price != null ? `$${p.price.toFixed(2)}` : "—"}</td>
                      <td className="py-2">{p.value != null ? `$${p.value.toFixed(2)}` : "—"}</td>
                      <td className={`py-2 ${p.pnl != null ? (p.pnl >= 0 ? "text-emerald-600" : "text-red-600") : ""}`}>
                        {p.pnl != null ? `${p.pnl >= 0 ? "+" : ""}$${p.pnl.toFixed(2)} (${(p.pnlPct ?? 0).toFixed(2)}%)` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityCurve} margin={{ left: 12, right: 12 }}>
                  <XAxis dataKey="t" hide />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip formatter={(v: number | string) => `$${Number(v).toFixed(2)}`} labelFormatter={(l) => `Date: ${l}`} />
                  <Line type="monotone" dataKey="v" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">Total Value: ${totalValue.toFixed(2)} (Cost: ${totalCost.toFixed(2)})</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
