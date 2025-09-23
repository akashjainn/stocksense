"use client";
import React from "react";
import type { ListRow } from '@/lib/api/market';

export interface Mover { symbol:string; name:string; price:number; chgPct:number; chg:number; volume:number; }

interface Props { initialType?: 'gainers'|'losers'|'actives'; }

const TABS: { key: Props['initialType']; label: string }[] = [
  { key: 'gainers', label: 'Top Gainers' },
  { key: 'losers', label: 'Top Losers' },
  { key: 'actives', label: 'Most Active' },
];

function cls(...c:(string|false|undefined|null)[]) { return c.filter(Boolean).join(' '); }

export const MarketMovers: React.FC<Props> = ({ initialType='gainers' }) => {
  const [type, setType] = React.useState<Props['initialType']>(initialType);
  const [boards, setBoards] = React.useState<{gainers:Mover[]; losers:Mover[]; actives: Mover[]}|null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/market/leaderboards', { cache: 'no-store' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      interface BoardsOk { gainers: ListRow[]; losers: ListRow[]; actives: ListRow[] }
      interface BoardsErr { error:string; message:string; data?: BoardsOk }
      const raw: unknown = await res.json();
      let source: BoardsOk | null = null;
      if (res.ok) {
        if (raw && typeof raw === 'object') source = raw as BoardsOk;
      } else {
        const err = raw as BoardsErr;
        if (err && typeof err === 'object' && err.data) source = err.data;
      }
      if (source) {
        setBoards({
          gainers: source.gainers.map(r => ({ symbol:r.symbol, name:r.name, price:r.price, chgPct:r.changePct, chg:r.change, volume:r.volume })),
          losers: source.losers.map(r => ({ symbol:r.symbol, name:r.name, price:r.price, chgPct:r.changePct, chg:r.change, volume:r.volume })),
          actives: source.actives.map(r => ({ symbol:r.symbol, name:r.name, price:r.price, chgPct:r.changePct, chg:r.change, volume:r.volume })),
        });
      }
    } catch (e) {
      console.error('[MarketMovers] failed to load leaderboards', e);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(()=>{ load(); const id = setInterval(load, 60_000); return ()=>clearInterval(id); }, [load]);

  const data: Mover[] = boards ? boards[type as keyof typeof boards] : [];

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
      {!loading && boards && data.length === 0 && (
        <div className="text-sm text-neutral-500">No mover data available (API plan limit or upstream empty response).</div>
      )}
      {!loading && boards && data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((m: Mover) => {
            const pos = m.chgPct >= 0;
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
