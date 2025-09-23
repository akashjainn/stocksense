import { NextRequest, NextResponse } from "next/server";
import dayjs from "dayjs";
import { cached } from '@/lib/cache';
import { buildProvider } from "@/lib/providers/prices";
import { fetchYahooDailyCandles } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = { date: string; close: number; open?: number; high?: number; low?: number; volume?: number };

const RANGE_MAP: Record<string, number> = {
  "1M": 31,
  "3M": 93,
  "6M": 186,
  "1Y": 372,
  "5Y": 1860,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolRaw = (searchParams.get("symbol") || "").trim();
  const range = (searchParams.get("range") || "6M").toUpperCase();
  if (!symbolRaw) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  const symbol = symbolRaw.toUpperCase();
  try {
    const { value } = await cached<Row[]>({
      key: `history:${symbol}:${range}`,
      ttlMs: 10 * 60 * 1000, // 10m fresh
      staleMs: 60 * 60 * 1000, // 1h stale acceptable for chart baselines
      fetcher: async () => {
        const days = RANGE_MAP[range];
        const to = dayjs();
        const from = days ? to.subtract(days, "day") : to.subtract(4000, "day");
        // Try Yahoo first
        let series: Row[] = [];
        try {
          const yahoo = await fetchYahooDailyCandles(symbol, from.format("YYYY-MM-DD"), to.format("YYYY-MM-DD"));
          series = yahoo.map(c => ({ date: c.t, close: c.c, open: c.o, high: c.h, low: c.l, volume: c.v }));
        } catch {
          try {
            const provider = buildProvider();
            const candles = await provider.getDailyCandles(symbol, from.format("YYYY-MM-DD"), to.format("YYYY-MM-DD"));
            series = candles.map(c => ({ date: dayjs(c.t).format("YYYY-MM-DD"), close: c.c, open: c.o, high: c.h, low: c.l, volume: c.v }));
          } catch {/* ignore */}
        }
        series.sort((a,b)=> a.date.localeCompare(b.date));
        return series;
      }
    });
    return NextResponse.json({ ok: true, symbol, range, series: value });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
