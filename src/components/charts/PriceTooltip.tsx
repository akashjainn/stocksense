"use client";

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: { close?: number; t?: number } }>;
  label?: number;
}

export default function PriceTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  
  const p = payload[0];
  const price = p?.value ?? p?.payload?.close;
  const timestamp = p?.payload?.t ?? label;

  if (!price || !timestamp) return null;

  const date = new Date(timestamp);
  const formattedDate = date.toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const formattedTime = date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm shadow-lg px-3 py-2 text-sm">
      <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
        {formattedDate} • {formattedTime}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-neutral-600 dark:text-neutral-300">Price</span>
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
          ${Number(price).toFixed(2)}
        </span>
      </div>
    </div>
  );
}