import { NextRequest } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { AssignCallSchema } from "@/lib/options/types";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = AssignCallSchema.parse(body);
    const db = await getMongoDb();

    // Record ASSIGNED_AWAY lot event (reduce shares)
    const assignShares = data.contracts * 100;
    await db.collection("lotEvents").insertOne({
      lotId: data.lotId,
      occurredAt: new Date(data.occurredAt),
      type: "ASSIGNED_AWAY",
      quantity: assignShares,
      memo: "Covered call assignment",
      createdAt: new Date(),
    });

    await db.collection("lots").updateOne(
      { _id: new ObjectId(data.lotId) },
      { $inc: { currentQty: -assignShares }, $set: { updatedAt: new Date() } },
    );

    // Record ASSIGN trade on option
    const trade = {
      optionPositionId: id,
      action: "ASSIGN",
      occurredAt: new Date(data.occurredAt),
      contracts: data.contracts,
      pricePerContract: 0,
      fees: 0,
      createdAt: new Date(),
    };
    const tradeRes = await db.collection("optionTrades").insertOne(trade);
    if (!tradeRes.insertedId) return Response.json({ error: "Failed to record assignment" }, { status: 500 });

    await db.collection("optionPositions").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "ASSIGNED", updatedAt: new Date() } },
    );

    return Response.json({ ok: true, tradeId: String(tradeRes.insertedId) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: "Failed to assign call", detail: msg }, { status: 500 });
  }
}
