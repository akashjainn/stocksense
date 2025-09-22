"use client";
import React from 'react';
import { IndicesStrip } from '@/components/market/IndicesStrip';
import { MarketMovers } from '@/components/market/MarketMovers';
import { CommandBar } from '@/components/market/CommandBar';
import { WatchlistCard } from '@/components/market/WatchlistCard';
import StockDetail from '@/components/StockDetail';

export default function MarketPage() {
  const [symbol, setSymbol] = React.useState('AAPL');
  const [showDetail, setShowDetail] = React.useState(false);

  const handleSelect = (s: string) => {
    setSymbol(s);
    setShowDetail(true);
    // scroll into view for mobile
    setTimeout(()=>{
      const el = document.getElementById('ticker-panel');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Market</h1>
        <div className="w-full md:w-[440px]">
          <CommandBar onSearchSelect={handleSelect} />
        </div>
      </div>
      <IndicesStrip />
      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-8 space-y-6">
          <MarketMovers />
          {showDetail && (
            <div id="ticker-panel">
              <StockDetail symbol={symbol} />
            </div>
          )}
        </section>
        <aside className="col-span-12 lg:col-span-4 space-y-6">
          <WatchlistCard onSelect={handleSelect} />
        </aside>
      </div>
    </div>
  );
}
