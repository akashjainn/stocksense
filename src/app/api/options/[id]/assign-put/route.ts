import { NextRequest } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { AssignPutSchema } from "@/lib/options/types";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = AssignPutSchema.parse(body);
    const db = await getMongoDb();

    // Load option to get strike and symbol
    const position = await db.collection("optionPositions").findOne({ _id: new ObjectId(id) });
    if (!position) return Response.json({ error: "Option not found" }, { status: 404 });

    const shares = data.contracts * (position.multiplier ?? 100);

    // Create new lot at strike price
    const lot = {
      accountId: data.accountId,
      symbol: position.symbol,
      openedAt: new Date(data.occurredAt),
      initialQty: shares,
      currentQty: shares,
      pricePerShare: Number(position.strike),
      feesAtOpen: 0,
      notes: "Assignment from short put",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const lotRes = await db.collection("lots").insertOne(lot);
    if (!lotRes.insertedId) return Response.json({ error: "Failed to create assigned lot" }, { status: 500 });

    await db.collection("lotEvents").insertOne({
      lotId: String(lotRes.insertedId),
      occurredAt: new Date(data.occurredAt),
      type: "ASSIGNMENT_IN",
      quantity: shares,
      memo: "Received shares from CSP assignment",
      createdAt: new Date(),
    });

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

    // TODO: Attach the original OPEN premium to this new lot by copying allocations from OPEN trade
    // This requires locating the OPEN trade and proportionally allocating to the new lot; implement next.

    return Response.json({ ok: true, tradeId: String(tradeRes.insertedId), lotId: String(lotRes.insertedId) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: "Failed to assign put", detail: msg }, { status: 500 });
  }
}
