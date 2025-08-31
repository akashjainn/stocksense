import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureDemoUser() {
  try {
    let user = await prisma.user.findFirst({ where: { email: "demo@stocksense.local" } });
    if (!user) {
      user = await prisma.user.create({ data: { email: "demo@stocksense.local", name: "Demo User" } });
    }
    return user;
  } catch (e) {
    // Retry once in case the database was just initialized
    await new Promise((r) => setTimeout(r, 100));
    let user = await prisma.user.findFirst({ where: { email: "demo@stocksense.local" } });
    if (!user) {
      user = await prisma.user.create({ data: { email: "demo@stocksense.local", name: "Demo User" } });
    }
    return user;
  }
}

export async function GET() {
  try {
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    console.log("Attempting to query accounts...");
    const accounts = await prisma.portfolioAccount.findMany({ orderBy: { createdAt: "asc" } });
    console.log("Found accounts:", accounts.length);
    return Response.json({ data: accounts });
  } catch (e) {
    console.error("Accounts GET error:", e);
    const msg = e instanceof Error ? e.message : "Unknown database error";
    return Response.json({ error: "Accounts query failed", detail: msg }, { status: 500 });
  }
}export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const user = await ensureDemoUser();
    const name = body.name?.trim() || "My Portfolio";
    const acct = await prisma.portfolioAccount.create({ data: { name, userId: user.id } });
    return Response.json({ ok: true, data: acct });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown database error";
  return Response.json({ error: "Account creation failed", detail: msg }, { status: 500 });
  }
}
