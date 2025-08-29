#!/usr/bin/env tsx
import { prisma } from "../lib/db";
import { getMarketProvider } from "../lib/market/providers";

async function main() {
  const symbolsArg = process.argv.find(a => a.startsWith("--symbols="));
  if (!symbolsArg) throw new Error("Usage: jobs:backfill --symbols=AAPL,MSFT");
  const symbols = symbolsArg.split("=")[1].split(",").map(s => s.trim()).filter(Boolean);
  const provider = getMarketProvider();

  // Ensure instruments
  // Ensure instruments via raw SQL to avoid type drift before migration generation
  for (const s of symbols) {
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO Instrument (id, symbol) VALUES (lower(hex(randomblob(16))), ?);`,
      s
    );
  }

  const from = new Date(); from.setFullYear(from.getFullYear() - 2);
  const to = new Date();

  // Daily bars
  for (const s of symbols) {
    const bars = await provider.getDailyBars([s], from.toISOString().slice(0,10), to.toISOString().slice(0,10));
    const inst: any = await prisma.$queryRawUnsafe(`SELECT symbol FROM Instrument WHERE symbol = ? LIMIT 1;`, s);
    if (!Array.isArray(inst) || inst.length === 0) continue;
    const symbolRow = inst[0] as { symbol: string };
    for (const b of bars) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO DailyBar (id, instrumentSymbol, t, o, h, l, c, v, source)
         VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, 'polygon')
         ON CONFLICT(instrumentSymbol, t) DO UPDATE SET o=excluded.o, h=excluded.h, l=excluded.l, c=excluded.c, v=excluded.v, source='polygon';`,
        symbolRow.symbol,
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
