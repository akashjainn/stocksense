import { NextRequest } from "next/server";
import { getRedis } from "@/lib/redis";
import { getBars } from "@/lib/marketData/alpaca";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const timeframe = (req.nextUrl.searchParams.get("timeframe") || "1Min") as "1Min"|"5Min"|"15Min"|"1Hour"|"1Day";
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  if (!symbol || !start || !end) return new Response("symbol,start,end required", { status: 400 });
  const key = `bars:${symbol}:${timeframe}:${start}:${end}`;
  try {
    const redis = getRedis();
    await redis.connect().catch(() => {});
    const cached = await redis.get(key);
    if (cached) return Response.json(JSON.parse(cached));
  } catch {}
  const data = await getBars({ symbols: symbol, timeframe, start, end });
  try {
    const redis = getRedis();
    await redis.connect().catch(() => {});
    await redis.setex(key, 60, JSON.stringify(data));
  } catch {}
  return Response.json(data);
}
