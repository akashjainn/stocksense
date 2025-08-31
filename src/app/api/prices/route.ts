import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildProvider } from "@/lib/providers/prices";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { symbols: string[]; startISO: string; endISO: string };
  const { symbols, startISO, endISO } = body;
  if (!symbols?.length || !startISO || !endISO) return new Response("symbols, startISO, endISO required", { status: 400 });
  const provider = buildProvider();
  for (const sym of symbols) {
    const sec = await prisma.security.upsert({ where: { symbol: sym }, create: { symbol: sym, name: sym }, update: {} });
    const candles = await provider.getDailyCandles(sym, startISO, endISO);
    for (const c of candles) {
      await prisma.price.upsert({
        where: { securityId_asOf: { securityId: sec.id, asOf: new Date(c.t) } },
        create: { securityId: sec.id, asOf: new Date(c.t), close: c.c, open: c.o, high: c.h, low: c.l, volume: c.v, source: "ALPHAVANTAGE" },
        update: { close: c.c, open: c.o, high: c.h, low: c.l, volume: c.v },
      });
    }
  }
  return Response.json({ ok: true });
}
