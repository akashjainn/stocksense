import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@stocksense.app" },
    update: {},
    create: { email: "demo@stocksense.app", name: "Demo" },
  });
  const acct = await prisma.account.create({
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

main().finally(() => prisma.$disconnect());
