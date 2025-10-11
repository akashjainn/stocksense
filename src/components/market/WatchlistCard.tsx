"use client";
import React from 'react';
import { dlog } from '@/lib/log';

interface Quote { price:number|null; percent:number|null; change:number|null; source?:string }

export const WatchlistCard: React.FC<{ symbols?: string[]; onSelect?: (s:string)=>void }> = ({ symbols = ['AAPL','MSFT','NVDA','TSLA'], onSelect }) => {
  const [data, setData] = React.useState<Record<string, Quote>>({});

  React.useEffect(()=>{
    let mounted = true;
    const load = async () => {
      try {
        const url = `/api/market/quotes?symbols=${symbols.join(',')}`;
        const r = await fetch(url, { cache: 'no-store' });
        const j = await r.json();
        if (!j.ok) throw new Error('quotes not ok');
        const next: Record<string, Quote> = { ...data }; // preserve existing during partial failures
        for (const q of j.quotes as any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
          next[q.symbol] = { price: q.price, percent: q.percent, change: q.change, source: q.source };
        }
        if (mounted) setData(next);
      } catch (err) {
        dlog('[Watchlist] batch fetch failed', err);
      }
    };
    load();
    const id = setInterval(load, 45_000); // existing cadence
    return () => { mounted=false; clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(',')]);

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
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100 tabular-nums">
                  {q?.price != null ? q.price.toFixed(2) : (data[sym]?.price != null ? data[sym]?.price?.toFixed(2) : '—')}
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
