import { NextRequest } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { CloseOptionSchema } from "@/lib/options/types";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = CloseOptionSchema.parse(body);
    const db = await getMongoDb();

    // Insert CLOSE trade (negative premium overall via allocations)
    const trade = {
      optionPositionId: id,
      action: "CLOSE",
      occurredAt: new Date(data.occurredAt),
      contracts: data.contracts,
      pricePerContract: data.pricePerContract,
      fees: data.fees ?? 0,
      createdAt: new Date(),
    };
    const tradeRes = await db.collection("optionTrades").insertOne(trade);
    if (!tradeRes.insertedId) return Response.json({ error: "Failed to create close trade" }, { status: 500 });

    // Premium is paid to close (negative); allocate proportionally
    const totalPremium = data.contracts * data.pricePerContract + (data.fees ?? 0);
    for (const alloc of data.allocations) {
      await db.collection("premiumAllocations").insertOne({
        optionTradeId: String(tradeRes.insertedId),
        lotId: alloc.lotId,
        premium: -totalPremium * alloc.proportion,
        fees: (data.fees ?? 0) * alloc.proportion,
        proportion: alloc.proportion,
        createdAt: new Date(),
      });
    }

    // Optionally mark position CLOSED if net contracts == 0 (skipped: requires aggregation)
  await db.collection("optionPositions").updateOne({ _id: new ObjectId(id) }, { $set: { updatedAt: new Date() } });

    return Response.json({ ok: true, tradeId: String(tradeRes.insertedId) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: "Failed to close option", detail: msg }, { status: 500 });
  }
}
