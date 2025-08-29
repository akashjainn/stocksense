import { NextRequest } from "next/server";
import { getRedis } from "@/lib/redis";
import { getSnapshots } from "@/lib/marketData/alpaca";

export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (!symbols.length) return new Response("symbols required", { status: 400 });
  const key = `snapshots:${symbols.sort().join(",")}`;
  try {
    const redis = getRedis();
    await redis.connect().catch(() => {});
    const cached = await redis.get(key);
    if (cached) return Response.json(JSON.parse(cached));
  } catch {}
  const data = await getSnapshots(symbols);
  try {
    const redis = getRedis();
    await redis.connect().catch(() => {});
    await redis.setex(key, 30, JSON.stringify(data));
  } catch {}
  return Response.json(data);
}
