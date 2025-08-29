import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const Txn = z.object({
  accountId: z.string(),
  symbol: z.string().optional(),
  type: z.enum(["BUY", "SELL", "DIV", "CASH"]),
  qty: z.number().optional(),
  price: z.number().optional(),
  fee: z.number().optional(),
  tradeDate: z.string(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = Txn.parse(body);
  let secId: string | undefined;
  if (data.symbol) {
    const sec = await prisma.security.upsert({
      where: { symbol: data.symbol },
      update: {},
      create: { symbol: data.symbol, name: data.symbol },
    });
    secId = sec.id;
  }
  const rec = await prisma.transaction.create({
    data: {
      accountId: data.accountId,
      securityId: secId,
      type: data.type,
      qty: data.qty ?? null,
      price: data.price ?? null,
      fee: data.fee ?? null,
      tradeDate: new Date(data.tradeDate),
      notes: data.notes,
    },
  });
  return Response.json({ ok: true, id: rec.id });
}

export async function GET() {
  const txns = await prisma.transaction.findMany({ orderBy: { tradeDate: "asc" } });
  return Response.json({ data: txns });
}
