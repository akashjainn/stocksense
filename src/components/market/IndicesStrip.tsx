"use client";
import React from "react";
// Now we call our internal API route so the FMP key stays server-side.

interface IndexData { symbol: string; label: string; price: number | null; percent: number | null; points: number | null; }

// Map real index symbols (FMP uses caret versions like ^GSPC) to display labels
const INDEX_MAP: Record<string,{ label:string }> = {
  '^GSPC': { label: 'S&P 500' },
  '^IXIC': { label: 'Nasdaq' },
  '^DJI': { label: 'Dow' },
};

function classNames(...c:(string|false|undefined|null)[]) { return c.filter(Boolean).join(" "); }

export const IndicesStrip: React.FC = () => {
  const [data, setData] = React.useState<IndexData[]>(() => Object.entries(INDEX_MAP).map(([symbol, meta]) => ({ symbol, label: meta.label, price: null, percent: null, points: null })));
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch('/api/market/indices', { cache: 'no-store' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json: Record<string, { price:number; change:number; changesPercentage:number }> = await res.json();
      const rows: IndexData[] = Object.entries(INDEX_MAP).map(([sym, meta]) => {
        const r = json[sym];
        return { symbol: sym, label: meta.label, price: r?.price ?? null, points: r?.change ?? null, percent: r?.changesPercentage ?? null };
      });
      setData(rows);
    } catch (e) {
      console.error('[IndicesStrip] failed to fetch indices', e);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-thin">
      {data.map(d => {
        const positive = (d.percent ?? 0) >= 0;
        return (
          <div key={d.symbol} className="min-w-[160px] rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
              <span>{d.label}</span>
              <span className={classNames("font-medium", positive?"text-emerald-600":"text-red-500")}>{d.percent!=null? `${positive?"+":""}${d.percent.toFixed(2)}%` : "—"}</span>
            </div>
            <div className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              {d.price!=null? d.price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}
            </div>
            <div className="text-[10px] text-neutral-500 dark:text-neutral-500">
              {d.points!=null? `${(d.points>=0?"+":"")}${d.points.toFixed(2)}`: ""}
            </div>
          </div>
        );
      })}
      {loading && data.length===0 && <div className="text-sm text-neutral-500">Loading indices...</div>}
    </div>
  );
};
