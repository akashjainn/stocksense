import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

async function ensureDemoUser() {
  let user = await prisma.user.findFirst({ where: { email: "demo@stocksense.local" } });
  if (!user) {
    user = await prisma.user.create({ data: { email: "demo@stocksense.local", name: "Demo User" } });
  }
  return user;
}

export async function GET() {
  try {
    const accounts = await prisma.portfolioAccount.findMany({ orderBy: { createdAt: "asc" } });
    return Response.json({ data: accounts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown database error";
    return new Response(`Accounts query failed: ${msg}`, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const user = await ensureDemoUser();
    const name = body.name?.trim() || "My Portfolio";
    const acct = await prisma.portfolioAccount.create({ data: { name, userId: user.id } });
    return Response.json({ ok: true, data: acct });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown database error";
    return new Response(`Account creation failed: ${msg}`, { status: 500 });
  }
}
