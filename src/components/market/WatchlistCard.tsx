"use client";
import React from 'react';

interface Quote { price:number|null; percent:number|null; change:number|null; }

export const WatchlistCard: React.FC<{ symbols?: string[]; onSelect?: (s:string)=>void }> = ({ symbols = ['AAPL','MSFT','NVDA','TSLA'], onSelect }) => {
  const [data, setData] = React.useState<Record<string, Quote>>({});

  React.useEffect(()=>{
    let mounted = true;
    const load = async () => {
      const entries: [string, Quote][] = await Promise.all(symbols.map(async s => {
        try {
          const r = await fetch(`/api/market/quote?symbol=${s}`);
          const j = await r.json();
          return [s, { price: j.quote?.price ?? null, percent: j.quote?.percent ?? null, change: j.quote?.change ?? null }];
        } catch { return [s, { price:null, percent:null, change:null }]; }
      }));
      if (mounted) setData(Object.fromEntries(entries));
    };
    load();
    const id = setInterval(load, 45_000);
    return () => { mounted=false; clearInterval(id); };
  }, [symbols]);

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Watchlist</h3>
        <span className="text-xs text-neutral-500">Auto 45s</span>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-auto pr-1">
        {symbols.map(sym => {
          const q = data[sym];
          const pos = (q?.percent ?? 0) >= 0;
          return (
            <button
              key={sym}
              onClick={()=>onSelect?.(sym)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 group"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-800 dark:text-neutral-100 text-sm">{sym}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                  {q?.price != null ? q.price.toFixed(2) : '—'}
                </span>
                <span className={`text-xs font-medium ${pos? 'text-emerald-600':'text-red-500'}`}>{q?.percent!=null? `${pos?'+':''}${q.percent.toFixed(2)}%`:'—'}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
