import { NextRequest, NextResponse } from "next/server";
import dayjs from "dayjs";
import { buildProvider } from "@/lib/providers/prices";

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
    const provider = buildProvider();
    // Determine from date based on range (MAX = earliest via large lookback)
    const days = RANGE_MAP[range];
    const to = dayjs();
    const from = days ? to.subtract(days, "day") : to.subtract(4000, "day");
    const candles = await provider.getDailyCandles(symbol, from.format("YYYY-MM-DD"), to.format("YYYY-MM-DD"));
    const series: Row[] = candles.map((c) => ({
      date: dayjs(c.t).format("YYYY-MM-DD"),
      close: c.c,
      open: c.o,
      high: c.h,
      low: c.l,
      volume: c.v,
    }));
    // Ensure sorted ascending by date
    series.sort((a, b) => a.date.localeCompare(b.date));
    return NextResponse.json({ ok: true, symbol, range, series });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
