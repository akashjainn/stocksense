"use client";
import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "@/components/metrics/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Transactions</h1>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <KpiCard label="Last Price" value={lastPrice != null ? `$${lastPrice.toFixed(2)}` : "—"} />
        <KpiCard label="Est. Cost" value={`$${estCost.toFixed(2)}`} />
        <KpiCard label="Type" value={type} />
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-5">
          <form className="grid gap-4 grid-cols-1 md:grid-cols-6 items-end" onSubmit={submit}>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">Account</label>
              <select className="border rounded px-3 py-2" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">Symbol</label>
              <input className="border rounded px-3 py-2" placeholder="AAPL" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">Type</label>
              <select className="border rounded px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
                {['BUY','SELL','DIV','CASH'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">Qty</label>
              <input type="number" step="any" className="border rounded px-3 py-2" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">Price</label>
              <input type="number" step="any" className="border rounded px-3 py-2" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={lastPrice != null ? lastPrice.toString() : ""} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">Trade Date</label>
              <input type="date" className="border rounded px-3 py-2" value={tradeDate} onChange={(e) => setTradeDate(e.target.value)} />
            </div>
            <div className="md:col-span-6">
              <Button type="submit">Add Transaction</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-5">
          <h2 className="text-lg font-medium">Recent Transactions</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Symbol</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Price</th>
                </tr>
              </thead>
              <tbody>
                {txns.slice().reverse().map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="py-2">{new Date(t.tradeDate).toLocaleDateString()}</td>
                    <td className="py-2">{t.type}</td>
                    <td className="py-2">{t.securityId ? symbol : "—"}</td>
                    <td className="py-2">{t.qty ?? "—"}</td>
                    <td className="py-2">{t.price != null ? `$${t.price}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
