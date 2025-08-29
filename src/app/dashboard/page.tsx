import { KpiCard } from "@/components/metrics/kpi-card";

export default async function DashboardPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/portfolio`, { cache: "no-store" });
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
