"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Pt = { t: string; v: number };

export default function PortfolioPage() {
  const [series, setSeries] = useState<Pt[]>([]);
  useEffect(() => {
    // placeholder: synthesize a small series from last 30 days using SPY close via prices API if available later
    const today = new Date();
    const arr: Pt[] = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (29 - i));
      return { t: d.toISOString().slice(0, 10), v: 10000 + Math.sin(i / 5) * 250 + i * 10 };
    });
    setSeries(arr);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Portfolio</h1>
      <Card className="rounded-2xl">
        <CardContent className="p-5">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ left: 12, right: 12 }}>
                <XAxis dataKey="t" hide tickLine={false} axisLine={false} />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip formatter={(v: number | string) => `$${Number(v).toFixed(2)}`} labelFormatter={(l) => `Date: ${l}`} />
                <Line type="monotone" dataKey="v" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
