#!/usr/bin/env tsx
import { prisma } from "../lib/prisma";
import { getMarketProvider } from "../lib/market/providers";

async function main() {
  const provider = getMarketProvider();
  // Discover symbols from instruments table
  const instrumentsUnknown = await prisma.$queryRawUnsafe(`SELECT symbol FROM Instrument;`).catch(() => []) as unknown;
  const instruments = Array.isArray(instrumentsUnknown) ? instrumentsUnknown as Array<{ symbol: string }> : [];
  const symbols = instruments.map((i) => i.symbol);
  if (symbols.length === 0) return;

  const today = new Date();
  const y = new Date(today); y.setDate(today.getDate() - 1);
  const from = y.toISOString().slice(0,10);
  const to = today.toISOString().slice(0,10);

  const barsBySym = new Map<string, Awaited<ReturnType<typeof provider.getDailyBars>>>();
  for (const sym of symbols) {
    const bars = await provider.getDailyBars([sym], from, to);
    barsBySym.set(sym, bars);
  }
  for (const inst of instruments) {
    const bars = barsBySym.get(inst.symbol) || [];
    for (const b of bars) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO DailyBar (id, instrumentSymbol, t, o, h, l, c, v, source)
         VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, 'polygon')
         ON CONFLICT(instrumentSymbol, t) DO UPDATE SET o=excluded.o, h=excluded.h, l=excluded.l, c=excluded.c, v=excluded.v, source='polygon';`,
        inst.symbol,
        new Date(b.t).toISOString(),
        b.o?.toString() ?? null,
        b.h?.toString() ?? null,
        b.l?.toString() ?? null,
        b.c.toString(),
        b.v ?? null
      );
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
