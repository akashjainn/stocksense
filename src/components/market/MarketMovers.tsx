"use client";
import React from "react";

export interface Mover { symbol:string; name:string; price:number; chgPct:number; chg:number; volume:number; spark:number[]; }

interface Props { initialType?: 'gainers'|'losers'|'active'; }

const TABS: { key: Props['initialType']; label: string }[] = [
  { key: 'gainers', label: 'Top Gainers' },
  { key: 'losers', label: 'Top Losers' },
  { key: 'active', label: 'Most Active' },
];

function cls(...c:(string|false|undefined|null)[]) { return c.filter(Boolean).join(' '); }

async function fetchMovers(type: Props['initialType']): Promise<Mover[]> {
  // Placeholder; swap with real backend route (e.g. /api/market/movers?type=...)
  // For now generate mock data
  return Array.from({length: 9}).map((_,i)=>{
    const base = 50 + i*7;
    const pct = (Math.random()*6 - 3) * (type==='losers'? -1 : 1);
    return {
      symbol: `STK${i+1}`,
      name: `Sample Corp ${i+1}`,
      price: base + pct,
      chgPct: pct,
      chg: (base * pct/100),
      volume: Math.round(Math.random()*50_000_000),
      spark: Array.from({length: 20}).map(()=> base + (Math.random()*4-2)),
    };
  });
}

export const MarketMovers: React.FC<Props> = ({ initialType='gainers' }) => {
  const [type, setType] = React.useState<Props['initialType']>(initialType);
  const [data, setData] = React.useState<Mover[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetchMovers(type);
    setData(res);
    setLoading(false);
  }, [type]);

  React.useEffect(()=>{ load(); }, [load]);

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={()=>setType(t.key)}
              className={cls(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border',
                type===t.key
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-transparent border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              )}
            >{t.label}</button>
          ))}
        </div>
        <div className="text-xs text-neutral-500">Auto-refresh 60s</div>
      </div>
      {loading && <div className="text-sm text-neutral-500">Loading movers...</div>}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(m => {
            const pos = m.chgPct >= 0;
            const min = Math.min(...m.spark); const max = Math.max(...m.spark);
            return (
              <div key={m.symbol} className="group rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-600 transition-all p-4 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">{m.symbol}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[120px]">{m.name}</div>
                  </div>
                  <div className={cls('text-xs font-medium', pos?'text-emerald-600':'text-red-500')}>
                    {pos?'+':''}{m.chgPct.toFixed(2)}%
                  </div>
                </div>
                <div className="mt-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">${m.price.toFixed(2)}</div>
                <div className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-500">Vol {(m.volume/1_000_000).toFixed(1)}M</div>
                <div className="mt-2 h-10">
                  <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full">
                    <polyline
                      fill="none"
                      stroke={pos? '#059669':'#dc2626'}
                      strokeWidth={1.5}
                      points={m.spark.map((v,i,arr)=>{
                        const x = (i/(arr.length-1))*100;
                        const y = max===min? 20 : 40 - ((v-min)/(max-min))*40;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
