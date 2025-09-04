import { NextRequest } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { snapshotLot, LotEventType } from "@/lib/options/lotMath";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const lotIds = lots.map((l) => String(l._id));

    const [events, allocs] = await Promise.all([
      db.collection("lotEvents").find({ lotId: { $in: lotIds } }, { sort: { occurredAt: 1 } }).toArray(),
      db.collection("premiumAllocations").find({ lotId: { $in: lotIds } }).toArray(),
    ]);

  const eventsByLot = new Map<string, Array<{ lotId: string; type: LotEventType; quantity?: number; amount?: number }>>();
    for (const e of events) {
      const k = e.lotId as string;
      if (!eventsByLot.has(k)) eventsByLot.set(k, []);
  eventsByLot.get(k)!.push({ lotId: k, type: e.type as LotEventType, quantity: e.quantity, amount: e.amount });
    }

    const allocsByLot = new Map<string, Array<{ lotId: string; premium: number; fees?: number }>>();
    for (const a of allocs) {
      const k = a.lotId as string;
      if (!allocsByLot.has(k)) allocsByLot.set(k, []);
      allocsByLot.get(k)!.push({ lotId: k, premium: a.premium, fees: a.fees });
    }

    const data = lots.map((lot) => {
      const lotId = String(lot._id);
      const snap = snapshotLot({
        initialQty: lot.initialQty,
        pricePerShare: lot.pricePerShare,
        feesAtOpen: lot.feesAtOpen ?? 0,
  events: (eventsByLot.get(lotId) ?? []).map((e) => ({ type: e.type, quantity: e.quantity, amount: e.amount })),
  premiumAllocs: (allocsByLot.get(lotId) ?? []).map((a) => ({ premium: a.premium, fees: a.fees })),
      });
      return {
        lot: {
          id: lotId,
          accountId: lot.accountId,
          symbol: lot.symbol,
          openedAt: lot.openedAt,
          initialQty: lot.initialQty,
          currentQty: lot.currentQty,
          pricePerShare: lot.pricePerShare,
          feesAtOpen: lot.feesAtOpen ?? 0,
          notes: lot.notes,
        },
        snapshot: snap,
      };
    });

    return Response.json({ data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: "Failed to build snapshots", detail: msg }, { status: 500 });
  }
}
