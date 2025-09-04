import { NextRequest } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { ExpireOptionSchema } from "@/lib/options/types";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = ExpireOptionSchema.parse(body);
    const db = await getMongoDb();

    const trade = {
      optionPositionId: id,
      action: "EXPIRE",
      occurredAt: new Date(data.occurredAt),
      contracts: data.contracts ?? 0,
      pricePerContract: 0,
      fees: 0,
      createdAt: new Date(),
    };
    const tradeRes = await db.collection("optionTrades").insertOne(trade);
    if (!tradeRes.insertedId) return Response.json({ error: "Failed to record expire" }, { status: 500 });

    await db.collection("optionPositions").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "EXPIRED", updatedAt: new Date() } },
    );

    return Response.json({ ok: true, tradeId: String(tradeRes.insertedId) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: "Failed to expire option", detail: msg }, { status: 500 });
  }
}
