"use client";
import React from "react";

interface IndexData { symbol: string; label: string; price: number | null; percent: number | null; points: number | null; spark: number[]; }

const INDICES: { symbol: string; label: string }[] = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "QQQ", label: "Nasdaq" },
  { symbol: "DIA", label: "Dow" },
];

function classNames(...c:(string|false|undefined|null)[]) { return c.filter(Boolean).join(" "); }

export const IndicesStrip: React.FC = () => {
  const [data, setData] = React.useState<IndexData[]>(() => INDICES.map(i => ({...i, price:null, percent:null, points:null, spark:[]})));
  const [loading, setLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    try {
      const results: IndexData[] = await Promise.all(INDICES.map(async idx => {
        const q = await fetch(`/api/market/quote?symbol=${idx.symbol}`, { cache: "no-store" }).then(r=>r.json()).catch(()=>null);
        const h = await fetch(`/api/market/history?symbol=${idx.symbol}&range=1M`).then(r=>r.json()).catch(()=>null);
        const series = h?.series || [];
        const closes = series.slice(-20).map((p: any) => p.close);
        const price = q?.quote?.price ?? null;
        const prev = q?.quote?.previousClose ?? null;
        return {
          symbol: idx.symbol,
            label: idx.label,
            price,
            percent: price!=null && prev!=null ? ((price - prev)/prev)*100 : null,
            points: price!=null && prev!=null ? price - prev : null,
            spark: closes,
        };
      }));
      setData(results);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60_000); // refresh every 60s
    return () => clearInterval(id);
  }, [fetchData]);

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
            <div className="h-6 w-full">
              <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-full w-full">
                {d.spark.length>1 && (
                  <polyline
                    fill="none"
                    stroke={positive?"#059669":"#dc2626"}
                    strokeWidth={1.5}
                    points={d.spark.map((v,i,arr)=>{
                      const x = (i/(arr.length-1))*100;
                      const min = Math.min(...arr); const max = Math.max(...arr);
                      const y = max===min? 12 : 24 - ((v-min)/(max-min))*24;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                )}
              </svg>
            </div>
          </div>
        );
      })}
      {loading && data.length===0 && <div className="text-sm text-neutral-500">Loading indices...</div>}
    </div>
  );
};
