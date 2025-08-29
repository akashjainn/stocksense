import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { buildProvider } from "@/lib/providers/prices";

export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (!symbols.length) return new Response("symbols required", { status: 400 });
  const key = `quotes:${symbols.sort().join(",")}`;
  try {
    const cached = await redis.get(key);
    if (cached) return Response.json(JSON.parse(cached));
  } catch {}
  const data = await buildProvider().getQuote(symbols);
  const payload = { data, at: Date.now() };
  try { await redis.setex(key, 30, JSON.stringify(payload)); } catch {}
  return Response.json(payload);
}
