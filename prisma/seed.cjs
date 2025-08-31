// Prisma seed in CommonJS to avoid TS loader issues
require('dotenv').config();
const { PrismaClient } = require("@prisma/client");
let prisma;

async function initPrisma() {
  try {
    const tursoUrl = process.env.TURSO_DATABASE_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('libsql://') ? process.env.DATABASE_URL : undefined);
    let tursoToken = process.env.TURSO_AUTH_TOKEN;
    if (tursoUrl && !tursoToken) {
      try {
        const u = new URL(tursoUrl);
        const q = u.searchParams.get('authToken');
        if (q) tursoToken = q;
      } catch {}
    }
    if (tursoUrl) {
      const { createClient } = require('@libsql/client');
      const { PrismaLibSQL } = require('@prisma/adapter-libsql');
      console.log('[seed] Turso URL startsWith libsql://', tursoUrl.startsWith('libsql://'));
      console.log('[seed] URL len', tursoUrl.length, 'token?', Boolean(tursoToken));
      const libsql = createClient({ url: tursoUrl, authToken: tursoToken });
      try {
        await libsql.execute('SELECT 1');
        console.log('[seed] Preflight SELECT 1 ok');
      } catch (e) {
        console.error('[seed] Preflight failed:', e && e.message ? e.message : e);
        throw e;
      }
      // @ts-expect-error types mismatch across esm/cjs
      const adapter = new PrismaLibSQL(libsql);
      prisma = new PrismaClient({ adapter });
      console.log('[seed] Using Turso/libSQL adapter');
    } else {
      prisma = new PrismaClient();
      console.log('[seed] Using default Prisma client');
    }
  } catch (e) {
    console.warn('[seed] Turso adapter init failed, falling back to default client:', e && e.message ? e.message : e);
    prisma = new PrismaClient();
  }
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@stocksense.app" },
    update: {},
    create: { email: "demo@stocksense.app", name: "Demo" },
  });
  const acct = await prisma.portfolioAccount.create({
    data: { userId: user.id, name: "Brokerage", baseCcy: "USD" },
  });
  await prisma.security.upsert({
    where: { symbol: "AAPL" },
    update: {},
    create: { symbol: "AAPL", name: "Apple Inc." },
  });
  await prisma.transaction.createMany({
    data: [
      {
        accountId: acct.id,
        type: "CASH",
        tradeDate: new Date("2024-01-01"),
        price: null,
        qty: null,
        fee: null,
        notes: "Deposit $10k",
      },
      {
        accountId: acct.id,
        type: "BUY",
        tradeDate: new Date("2024-02-01"),
        price: 185,
        qty: 20,
        fee: 1,
        notes: "AAPL",
      },
    ],
  });
}

initPrisma()
  .then(() => main())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
