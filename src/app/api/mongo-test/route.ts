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
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
