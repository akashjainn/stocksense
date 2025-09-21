import { NextRequest, NextResponse } from "next/server";
import { fetchYahooQuoteSummary } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Quote = {
  symbol: string;
  price: number | null;
  change: number | null;
  percent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  latestTradingDay?: string | null;
};

function toNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolRaw = (searchParams.get("symbol") || "").trim();
  if (!symbolRaw) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  const symbol = symbolRaw.toUpperCase();

  try {
    const { headers, values } = await fetchYahooQuoteSummary(symbol, { price: [
      "regularMarketPrice",
      "regularMarketChange",
      "regularMarketChangePercent",
      "regularMarketOpen",
      "regularMarketDayHigh",
      "regularMarketDayLow",
      "regularMarketPreviousClose",
      "regularMarketTime"
    ] });
    const data: Record<string, unknown> = {};
    headers.forEach((h, i) => (data[h] = values[i]));
    const quote: Quote = {
      symbol,
      price: toNum(data.regularMarketPrice),
      change: toNum(data.regularMarketChange),
      percent: toNum(data.regularMarketChangePercent),
      open: toNum(data.regularMarketOpen),
      high: toNum(data.regularMarketDayHigh),
      low: toNum(data.regularMarketDayLow),
      previousClose: toNum(data.regularMarketPreviousClose),
      latestTradingDay: typeof data.regularMarketTime === "number" ? new Date((data.regularMarketTime as number) * 1000).toISOString().slice(0,10) : null,
    };
    return NextResponse.json({ ok: true, quote });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
