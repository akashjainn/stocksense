import { NextRequest } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import type { ObjectId } from "mongodb";
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
    const db = await getMongoDb();
    // Upsert a security document if symbol provided
    let securityId: string | undefined;
    if (data.symbol) {
      const sec = await db.collection("securities").findOneAndUpdate(
        { symbol: data.symbol },
        { $setOnInsert: { symbol: data.symbol, name: data.symbol, createdAt: new Date() } },
        { upsert: true, returnDocument: "after", projection: { _id: 1 } }
      );
      const idVal = sec?.value?._id;
      if (idVal) securityId = String(idVal);
    }
    const txDoc = {
      accountId: data.accountId,
      securityId: securityId,
      symbol: data.symbol,
      type: data.type,
      qty: data.qty ?? null,
      price: data.price ?? null,
      fee: data.fee ?? null,
      tradeDate: new Date(data.tradeDate),
      notes: data.notes,
      createdAt: new Date(),
    };
    const ins = await db.collection("transactions").insertOne(txDoc);
    if (!ins.insertedId) {
      return Response.json(
        { error: "Transaction create failed: no id returned" },
        { status: 500 }
      );
    }
    return Response.json({ ok: true, id: String(ins.insertedId) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: "Transaction create failed", detail: msg }, { status: 500 });
  }
}

export async function GET() {
  const db = await getMongoDb();
  const txCol = db.collection("transactions");
  const cursor = txCol.find({}, { sort: { tradeDate: 1 } });
  type TxDoc = {
    _id: ObjectId;
    accountId: string;
    securityId?: string;
    symbol?: string;
    type: "BUY" | "SELL" | "DIV" | "CASH";
    qty?: number | null;
    price?: number | null;
    fee?: number | null;
    tradeDate: Date;
    notes?: string;
  };
  const docs = await cursor.toArray() as TxDoc[];
  const data = docs.map((t) => ({
    id: String(t._id),
    accountId: t.accountId,
    securityId: t.securityId,
    symbol: t.symbol, // if you later embed symbol, include it here
    type: t.type,
    qty: t.qty != null ? Number(t.qty) : null,
    price: t.price != null ? Number(t.price) : null,
    fee: t.fee != null ? Number(t.fee) : null,
    tradeDate: t.tradeDate,
    notes: t.notes ?? undefined,
  }));
  return Response.json({ data });
}
