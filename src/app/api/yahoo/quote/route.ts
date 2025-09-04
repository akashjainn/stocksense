import { NextRequest } from "next/server";
import { fetchYahooQuoteSummary } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticker, modules } = body as { ticker?: string; modules?: Record<string, string[]> };
    if (!ticker || !modules) return Response.json({ error: "Missing ticker or modules" }, { status: 400 });
    const data = await fetchYahooQuoteSummary(ticker, modules);
    return Response.json({ ok: true, ...data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
