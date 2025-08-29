"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

export type EquityPoint = { t: string; v: number };

export function PortfolioChart({ data, height = 288 }: { data: EquityPoint[]; height?: number }) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 12, right: 12 }}>
          <XAxis dataKey="t" hide />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip formatter={(v: number | string) => `$${Number(v).toFixed(2)}`} labelFormatter={(l) => `Date: ${l}`} />
          <Line type="monotone" dataKey="v" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
