import { NextRequest } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { snapshotLot } from "@/lib/options/lotMath";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ lotId: string }> }) {
  try {
  const { lotId } = await params;
    const db = await getMongoDb();
  const lot = await db.collection("lots").findOne({ _id: new ObjectId(lotId) });
    if (!lot) return Response.json({ error: "Lot not found" }, { status: 404 });

    const events = await db
      .collection("lotEvents")
      .find({ lotId }, { sort: { occurredAt: 1 } })
      .toArray();

    const allocs = await db
      .collection("premiumAllocations")
      .find({ lotId })
      .toArray();

    const snap = snapshotLot({
      initialQty: lot.initialQty,
      pricePerShare: lot.pricePerShare,
      feesAtOpen: lot.feesAtOpen ?? 0,
      events: events.map((e) => ({
        type: e.type,
        quantity: e.quantity,
        amount: e.amount,
      })),
      premiumAllocs: allocs.map((a) => ({ premium: a.premium, fees: a.fees })),
    });

    return Response.json({
      lot: {
        id: String(lot._id),
        accountId: lot.accountId,
        symbol: lot.symbol,
        openedAt: lot.openedAt,
        initialQty: lot.initialQty,
        currentQty: lot.currentQty,
        pricePerShare: lot.pricePerShare,
        feesAtOpen: lot.feesAtOpen ?? 0,
      },
      snapshot: snap,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: "Failed to build lot snapshot", detail: msg }, { status: 500 });
  }
}
