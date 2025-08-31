import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  try {
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
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: "Transaction create failed", detail: msg }, { status: 500 });
  }
}

export async function GET() {
  const txns = await prisma.transaction.findMany({ orderBy: { tradeDate: "asc" }, include: { security: true } });
  const data = txns.map((t) => ({
    id: t.id,
    accountId: t.accountId,
    securityId: t.securityId,
    symbol: t.security?.symbol,
    type: t.type,
    qty: t.qty != null ? Number(t.qty) : null,
    price: t.price != null ? Number(t.price) : null,
    fee: t.fee != null ? Number(t.fee) : null,
    tradeDate: t.tradeDate,
    notes: t.notes ?? undefined,
  }));
  return Response.json({ data });
}
