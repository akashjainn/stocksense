import { NextRequest } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { CreateLotSchema } from "@/lib/options/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateLotSchema.parse(body);
    const db = await getMongoDb();

    const lot = {
      accountId: data.accountId,
      symbol: data.symbol,
      openedAt: new Date(data.openedAt),
      initialQty: data.quantity,
      currentQty: data.quantity,
      pricePerShare: data.pricePerShare,
      feesAtOpen: data.fees ?? 0,
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ins = await db.collection("lots").insertOne(lot);
    if (!ins.insertedId) {
      return Response.json({ error: "Failed to create lot" }, { status: 500 });
    }

    // Record a BUY event for traceability
    await db.collection("lotEvents").insertOne({
      lotId: String(ins.insertedId),
      occurredAt: lot.openedAt,
      type: "BUY",
      quantity: data.quantity,
      amount: data.pricePerShare,
      memo: "Initial purchase",
      createdAt: new Date(),
    });

    return Response.json({ ok: true, id: String(ins.insertedId) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: "Failed to create lot", detail: msg }, { status: 500 });
  }
}

// List lots for an account
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId");
    if (!accountId) return Response.json({ data: [] });
    const db = await getMongoDb();
    const lots = await db
      .collection("lots")
      .find({ accountId }, { sort: { openedAt: 1 } })
      .toArray();
    return Response.json({ data: lots.map((l) => ({
      id: String(l._id),
      accountId: l.accountId,
      symbol: l.symbol,
      openedAt: l.openedAt,
      initialQty: l.initialQty,
      currentQty: l.currentQty,
      pricePerShare: l.pricePerShare,
      feesAtOpen: l.feesAtOpen ?? 0,
      notes: l.notes,
    })) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: "Failed to list lots", detail: msg }, { status: 500 });
  }
}
