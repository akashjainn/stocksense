"use client";
import { useEffect, useMemo, useState } from "react";
import { ensureAccount } from "@/lib/client/portfolio";

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

type LotSnapshotResp = {
  lot: Lot;
  snapshot: {
    currentQty: number;
    grossCost: number;
    netPremium: number;
    effectiveBasis: number;
    effectivePricePerShare: number;
  };
};

export default function OptionsDashboardPage() {
  // accountId reserved for future filtering
  const [lots, setLots] = useState<Lot[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, LotSnapshotResp["snapshot"]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
  const acct = await ensureAccount();
        const res = await fetch(`/api/lots?accountId=${encodeURIComponent(acct.id)}`);
        const j = await res.json();
        setLots(j.data ?? []);
        // fetch snapshots
        const snaps: Record<string, LotSnapshotResp["snapshot"]> = {};
        for (const lot of j.data ?? []) {
          const r = await fetch(`/api/lots/${lot.id}/snapshot`);
          const s = await r.json();
          if (s?.snapshot) snaps[lot.id] = s.snapshot;
        }
        setSnapshots(snaps);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load options dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rows = useMemo(() => {
    return lots.map((l) => ({
      ...l,
      effPps: snapshots[l.id]?.effectivePricePerShare ?? l.pricePerShare,
      netPrem: snapshots[l.id]?.netPremium ?? 0,
    }));
  }, [lots, snapshots]);

  if (loading) return <div className="p-6">Loading Options Dashboard…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Options Dashboard</h1>
        <p className="text-sm text-neutral-600">Track per-lot effective price/share from option premiums.</p>
      </div>
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-neutral-200 dark:border-neutral-800">
              <th className="py-2">Symbol</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Orig PPS</th>
              <th className="py-2 text-right">Net Premium</th>
              <th className="py-2 text-right">Effective PPS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100 dark:border-neutral-800">
                <td className="py-2">{r.symbol}</td>
                <td className="py-2 text-right">{r.currentQty}</td>
                <td className="py-2 text-right">${r.pricePerShare.toFixed(2)}</td>
                <td className="py-2 text-right">${r.netPrem.toFixed(2)}</td>
                <td className="py-2 text-right font-medium">${r.effPps.toFixed(2)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-neutral-500">No lots yet. Create a lot via POST /api/lots or import/assign puts.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
