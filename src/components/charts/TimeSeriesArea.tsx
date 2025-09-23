"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useMemo } from "react";
import PriceTooltip from "./PriceTooltip";

type Point = { 
  date: string | number | Date; 
  value: number;
  benchmark?: number;
};

type Props = {
  data: Point[];
  /** e.g. "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL" */
  period: string;
  /** Shows gradient for positive/negative performance */
  isPositive?: boolean;
  /** Show benchmark line */
  showBenchmark?: boolean;
};

function formatDate(d: Date, period: string) {
  if (["1D", "1W"].includes(period)) {
    // intraday / short range → time
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  // longer range → date
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function domainFor(data: Point[]) {
  if (!data?.length) return ["auto", "auto"] as const;
  let min = Infinity, max = -Infinity;
  for (const point of data) {
    const value = point.value;
    const benchmark = point.benchmark;
    if (value < min) min = value;
    if (value > max) max = value;
    if (benchmark != null) {
      if (benchmark < min) min = benchmark;
      if (benchmark > max) max = benchmark;
    }
  }
  if (!isFinite(min) || !isFinite(max)) return ["auto", "auto"] as const;
  // add a small pad so the line isn't glued to the edges
  const pad = (max - min) * 0.06 || Math.max(1, max * 0.01);
  return [Math.max(0, min - pad), max + pad] as const;
}

export default function TimeSeriesArea({ 
  data, 
  period, 
  isPositive = true,
  showBenchmark = false 
}: Props) {
  const prepared = useMemo(
    () =>
      (data ?? []).map(d => ({
        // ensure X is a timestamp for smooth tooltip movement
        t: typeof d.date === "string" || d.date instanceof Date ? new Date(d.date).getTime() : Number(d.date),
        value: d.value,
        benchmark: d.benchmark ?? null,
      })),
    [data]
  );

  const yDomain = useMemo(() => domainFor(data), [data]);

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={prepared} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? "#059669" : "#dc2626"} stopOpacity={0.15} />
              <stop offset="95%" stopColor={isPositive ? "#059669" : "#dc2626"} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgb(229 231 235 / 0.3)" 
            className="dark:stroke-neutral-700/30"
          />

          <XAxis
            type="number"
            dataKey="t"
            domain={["dataMin", "dataMax"]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "rgb(107 114 128)" }}
            className="dark:fill-neutral-400"
            minTickGap={30}
            tickFormatter={(v) => formatDate(new Date(v), period)}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "rgb(107 114 128)" }}
            className="dark:fill-neutral-400"
            domain={yDomain}
            width={65}
            tickFormatter={(value) => {
              if (value >= 1000000) {
                return `$${(value / 1000000).toFixed(1)}M`;
              } else if (value >= 1000) {
                return `$${(value / 1000).toFixed(0)}K`;
              } else {
                return `$${value.toFixed(0)}`;
              }
            }}
          />

          <Tooltip 
            content={<PriceTooltip />}
            wrapperStyle={{ outline: "none" }}
            cursor={{ 
              stroke: "rgb(156 163 175 / 0.4)", 
              strokeWidth: 1,
              strokeDasharray: "4 4"
            }}
          />

          {/* Benchmark line (if enabled) */}
          {showBenchmark && (
            <Area
              type="monotone"
              dataKey="benchmark"
              stroke="rgb(107 114 128 / 0.7)"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              fill="transparent"
              dot={false}
            />
          )}

          {/* Main area */}
          <Area
            type="monotone"
            dataKey="value"
            stroke={isPositive ? "#059669" : "#dc2626"}
            strokeWidth={2}
            fill="url(#gradient-area)"
            dot={false}
            activeDot={{
              r: 4,
              fill: isPositive ? "#059669" : "#dc2626",
              stroke: "white",
              strokeWidth: 2,
              className: "dark:stroke-neutral-900"
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}