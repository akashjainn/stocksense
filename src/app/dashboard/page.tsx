export default async function DashboardPage() {
  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold">StockSense Dashboard</h1>
      <p className="text-sm text-gray-500 mt-2">
        This is your starting point. Next steps: positions, performance, charts.
      </p>
      <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="text-xs uppercase text-gray-500">Total Value</div>
          <div className="text-xl font-medium">$—</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs uppercase text-gray-500">P/L</div>
          <div className="text-xl font-medium">$—</div>
        </div>
      </div>
    </main>
  );
}
