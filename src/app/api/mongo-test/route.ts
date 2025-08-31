import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getMongoDb();
    // Run a simple command to verify connectivity
    const admin = db.admin();
    const ping = await admin.ping();
    const info = await admin.serverInfo();
    return NextResponse.json({ ok: true, ping, info });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
