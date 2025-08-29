import { KpiCard } from "@/components/metrics/kpi-card";
import { headers } from "next/headers";

export default async function DashboardPage() {
  // Build an absolute URL for server-side fetch (required on Vercel/Node)
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || process.env.VERCEL_URL || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const base = `${proto}://${host}`;
  const res = await fetch(new URL("/api/portfolio", base), { cache: "no-store" });
  const data = await res.json().catch(() => ({ cash: 0, totalCost: 0, totalValue: 0 }));
  const { cash, totalCost, totalValue } = data;
  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold">StockSense Dashboard</h1>
      <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Value" value={`$${Number(totalValue).toLocaleString()}`} />
        <KpiCard label="Invested (Cost)" value={`$${Number(totalCost).toLocaleString()}`} />
        <KpiCard label="Cash" value={`$${Number(cash).toLocaleString()}`} />
        <KpiCard label="Day P&L" value="$—" />
      </div>
    </main>
  );
}
