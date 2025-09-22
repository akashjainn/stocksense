"use client";
import React from 'react';

interface Action { id:string; label:string; hint?:string; onTrigger: () => void; }

export const CommandBar: React.FC<{ onSearchSelect?: (symbol:string)=>void }> = ({ onSearchSelect }) => {
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [results, setResults] = React.useState<{symbol:string; name:string}[]>([]);

  const actions: Action[] = [
    { id: 'add-watch', label: 'Add to Watchlist', hint: 'Current symbol', onTrigger: () => console.log('watch') },
    { id: 'add-txn', label: 'Add Transaction', hint: 'Open form', onTrigger: () => console.log('txn') },
  ];

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  React.useEffect(()=>{
    let cancelled = false;
    if (query.trim().length === 0) { setResults([]); return; }
    const load = async () => {
      try {
        const r = await fetch(`/api/market/search?q=${encodeURIComponent(query)}`);
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) setResults(j.slice(0,8));
      } catch {}
    };
    const id = setTimeout(load, 180);
    return () => { cancelled = true; clearTimeout(id); };
  }, [query]);

  return (
    <div className="relative">
      <div className="flex items-center rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2 focus-within:ring-2 focus-within:ring-emerald-500/40">
        <span className="text-neutral-400 text-sm mr-2">⌘K</span>
        <input
          value={query}
            onChange={e=>{ setQuery(e.target.value); setOpen(true); }}
            placeholder="Search ticker or command..."
            className="flex-1 bg-transparent outline-none text-sm text-neutral-700 dark:text-neutral-200 placeholder-neutral-400"
        />
      </div>
      {open && (results.length>0 || actions.length>0) && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg max-h-[420px] overflow-auto divide-y divide-neutral-200 dark:divide-neutral-800">
          {results.length>0 && (
            <div className="p-2">
              <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-500">Symbols</div>
              {results.map(r => (
                <button
                  key={r.symbol}
                  className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between"
                  onClick={() => { onSearchSelect?.(r.symbol); setOpen(false); setQuery(''); }}
                >
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">{r.symbol}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate ml-3">{r.name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="p-2">
            <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-500">Actions</div>
            {actions.map(a => (
              <button
                key={a.id}
                className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between"
                onClick={() => { a.onTrigger(); setOpen(false); }}
              >
                <span className="text-neutral-700 dark:text-neutral-200 font-medium">{a.label}</span>
                {a.hint && <span className="text-xs text-neutral-500 ml-3">{a.hint}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
