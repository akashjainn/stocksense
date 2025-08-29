import { enqueueNightlyETL } from "@/lib/jobs";

export async function POST() {
  await enqueueNightlyETL(["AAPL", "MSFT", "SPY"]);
  return Response.json({ ok: true });
}
