"use client";
import React from 'react';
import { PortfolioOverview } from '@/components/portfolio/PortfolioOverview';
import { PortfolioChart } from '@/components/portfolio/PortfolioChart';
import { HoldingsTable } from '@/components/portfolio/HoldingsTable';
import { PortfolioActions } from '@/components/portfolio/PortfolioActions';

export default function PortfolioPage() {
  const [selectedPeriod, setSelectedPeriod] = React.useState('6M');
  const [selectedPosition, setSelectedPosition] = React.useState<string | null>(null);

  const handlePositionSelect = (symbol: string) => {
    setSelectedPosition(symbol);
    // scroll into view for mobile
    setTimeout(()=>{
      const el = document.getElementById('position-detail');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Portfolio</h1>
        <div className="w-full md:w-[440px]">
          <PortfolioActions />
        </div>
      </div>
      <PortfolioOverview />
      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-8 space-y-6">
          <PortfolioChart period={selectedPeriod} onPeriodChange={setSelectedPeriod} />
          {selectedPosition && (
            <div id="position-detail">
              {/* Position detail component will go here */}
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                <h3 className="text-lg font-semibold mb-4">Position Detail: {selectedPosition}</h3>
                <p className="text-neutral-600 dark:text-neutral-400">Position analysis coming soon...</p>
              </div>
            </div>
          )}
        </section>
        <aside className="col-span-12 lg:col-span-4 space-y-6">
          <HoldingsTable onPositionSelect={handlePositionSelect} />
        </aside>
      </div>
    </div>
  );
}