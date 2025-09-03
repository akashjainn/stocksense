import { NextRequest } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { OpenOptionSchema } from "@/lib/options/types";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = OpenOptionSchema.parse(body);
    const db = await getMongoDb();

    // Validate allocations sum to 1.0
    const totalProportion = data.allocations.reduce((sum, a) => sum + a.proportion, 0);
    if (Math.abs(totalProportion - 1.0) > 0.01) {
      return Response.json({ error: "Allocations must sum to 1.0" }, { status: 400 });
    }

    // Validate lots exist and have sufficient shares for covered calls
    if (data.type === "CALL") {
      for (const alloc of data.allocations) {
        const lot = await db.collection("lots").findOne({ _id: new ObjectId(alloc.lotId) });
        if (!lot) {
          return Response.json({ error: `Lot ${alloc.lotId} not found` }, { status: 400 });
        }
        const requiredShares = Math.ceil(data.contracts * 100 * alloc.proportion);
        if (lot.currentQty < requiredShares) {
          return Response.json({ 
            error: `Insufficient shares in lot ${lot.symbol}: need ${requiredShares}, have ${lot.currentQty}` 
          }, { status: 400 });
        }
      }
    }

    // Create option position
    const position = {
      accountId: data.accountId,
      symbol: data.symbol,
      type: data.type,
      side: "SHORT" as const,
      strike: data.strike,
      expiry: new Date(data.expiry),
      multiplier: 100,
      status: "OPEN",
      openedAt: new Date(data.openedAt),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const posResult = await db.collection("optionPositions").insertOne(position);
    if (!posResult.insertedId) {
      return Response.json({ error: "Failed to create option position" }, { status: 500 });
    }

    // Create option trade
    const trade = {
      optionPositionId: String(posResult.insertedId),
      action: "OPEN",
      occurredAt: new Date(data.openedAt),
      contracts: data.contracts,
      pricePerContract: data.pricePerContract,
      fees: data.fees ?? 0,
      createdAt: new Date(),
    };

    const tradeResult = await db.collection("optionTrades").insertOne(trade);
    if (!tradeResult.insertedId) {
      return Response.json({ error: "Failed to create option trade" }, { status: 500 });
    }

    // Create premium allocations
    const totalPremium = data.contracts * data.pricePerContract - (data.fees ?? 0);
    
    for (const alloc of data.allocations) {
      const allocPremium = totalPremium * alloc.proportion;
      const allocFees = (data.fees ?? 0) * alloc.proportion;
      
      await db.collection("premiumAllocations").insertOne({
        optionTradeId: String(tradeResult.insertedId),
        lotId: alloc.lotId,
        premium: allocPremium,
        fees: allocFees,
        proportion: alloc.proportion,
        createdAt: new Date(),
      });
    }

    return Response.json({ 
      ok: true, 
      positionId: String(posResult.insertedId),
      tradeId: String(tradeResult.insertedId),
      totalPremium
    }, { status: 201 });

  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: "Failed to open option", detail: msg }, { status: 500 });
  }
}
