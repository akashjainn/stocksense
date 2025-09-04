import { NextRequest } from "next/server";
import { fetchYahooStockL1 } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const ticker = url.searchParams.get("ticker");
    if (!ticker) return Response.json({ error: "Missing ticker" }, { status: 400 });
    const data = await fetchYahooStockL1(ticker);
    return Response.json({ ok: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
