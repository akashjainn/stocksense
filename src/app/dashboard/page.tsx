import { KpiCard } from "@/components/metrics/kpi-card";
import { headers } from "next/headers";
import { Card, CardContent } from "@/components/ui/card";
import { PortfolioChart } from "@/components/metrics/portfolio-chart";

type PositionRow = { symbol: string; qty: number; cost: number; price?: number; value?: number; pnl?: number; pnlPct?: number };

export default async function DashboardPage() {
  // Build an absolute URL for server-side fetch (required on Vercel/Node)
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || process.env.VERCEL_URL || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const base = `${proto}://${host}`;
  const res = await fetch(new URL("/api/portfolio", base), { cache: "no-store" });
  const data = await res.json().catch(() => ({ cash: 0, totalCost: 0, totalValue: 0, positions: [], equityCurve: [] } as {
    cash: number; totalCost: number; totalValue: number; positions: PositionRow[]; equityCurve: { t: string; v: number }[];
  }));
  const { cash, totalCost, totalValue, positions = [], equityCurve = [] } = data as {
    cash: number; totalCost: number; totalValue: number; positions: PositionRow[]; equityCurve: { t: string; v: number }[];
  };
  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold">StockSense Dashboard</h1>
      <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Value" value={`$${Number(totalValue).toLocaleString()}`} />
        <KpiCard label="Invested (Cost)" value={`$${Number(totalCost).toLocaleString()}`} />
        <KpiCard label="Cash" value={`$${Number(cash).toLocaleString()}`} />
        <KpiCard label="Day P&L" value="$—" />
      </div>
      <div className="mt-6 grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardContent className="p-5">
            <h2 className="text-lg font-medium">Portfolio Value</h2>
            <div className="mt-4"><PortfolioChart data={equityCurve} /></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <h2 className="text-lg font-medium">Positions</h2>
            <div className="mt-4 max-h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground sticky top-0 bg-background">
                  <tr>
                    <th className="py-2">Symbol</th>
                    <th className="py-2">Qty</th>
                    <th className="py-2">Avg Cost</th>
                    <th className="py-2">Price</th>
                    <th className="py-2">Value</th>
                    <th className="py-2">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p: PositionRow) => (
                    <tr key={p.symbol} className="border-t">
                      <td className="py-2">{p.symbol}</td>
                      <td className="py-2">{Number(p.qty).toLocaleString()}</td>
                      <td className="py-2">${(p.cost / Math.max(1, p.qty)).toFixed(2)}</td>
                      <td className="py-2">{p.price != null ? `$${p.price.toFixed(2)}` : "—"}</td>
                      <td className="py-2">{p.value != null ? `$${p.value.toFixed(2)}` : "—"}</td>
                      <td className={`py-2 ${p.pnl != null ? (p.pnl >= 0 ? "text-emerald-600" : "text-red-600") : ""}`}>
                        {p.pnl != null ? `${p.pnl >= 0 ? "+" : ""}$${p.pnl.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
