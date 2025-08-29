"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

type Quote = { price: number; open?: number };

export default function LiveMarketsPage() {
  const [symbols] = useState(["AAPL", "MSFT", "SPY"]);
  const [data, setData] = useState<Record<string, Quote>>({});

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch(`/api/quotes?symbols=${symbols.join(",")}`, { cache: "no-store" });
        const j = await res.json();
        if (active) setData(j.data || {});
      } catch {}
    }
    poll();
    const id = setInterval(poll, 30000);
    return () => { active = false; clearInterval(id); };
  }, [symbols]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Live Market Data</h1>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {symbols.map((s) => {
          const q = data[s];
          const price = q?.price;
          const open = q?.open;
          const pct = price != null && open ? ((price - open) / open) * 100 : null;
          return (
            <Card key={s} className="rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-medium">{s}</h2>
                  <span className="text-2xl font-semibold">{price != null ? `$${price.toFixed(2)}` : "—"}</span>
                </div>
                <div className={`mt-2 text-sm ${pct != null ? (pct >= 0 ? "text-emerald-600" : "text-red-600") : "text-muted-foreground"}`}>
                  {pct != null ? `${pct.toFixed(2)}%` : "No change"}
                </div>
                <div className="mt-4 h-16 w-full bg-muted rounded" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
