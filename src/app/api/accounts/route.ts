import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

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

async function ensureSchema() {
  const url = process.env.DATABASE_URL || "";
  if (!url.startsWith("file:")) return; // bootstrap only for SQLite
  try {
    const migPath = path.resolve(process.cwd(), "prisma", "migrations", "20250829142012_init", "migration.sql");
    const sql = fs.readFileSync(migPath, "utf8");
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).$executeRawUnsafe(stmt);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!/already exists/i.test(msg)) {
          throw e;
        }
      }
    }
  } catch (e) {
    console.error("Schema bootstrap failed:", e);
  }
}

export async function GET() {
  try {
    const accounts = await prisma.portfolioAccount.findMany({ orderBy: { createdAt: "asc" } });
    return Response.json({ data: accounts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown database error";
    if (/no such table/i.test(msg)) {
      await ensureSchema();
      try {
        const accounts = await prisma.portfolioAccount.findMany({ orderBy: { createdAt: "asc" } });
        return Response.json({ data: accounts });
      } catch (e2) {
        const msg2 = e2 instanceof Error ? e2.message : "Unknown database error";
        return Response.json({ error: "Accounts query failed", detail: msg2 }, { status: 500 });
      }
    }
    return Response.json({ error: "Accounts query failed", detail: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const user = await ensureDemoUser();
    const name = body.name?.trim() || "My Portfolio";
    const acct = await prisma.portfolioAccount.create({ data: { name, userId: user.id } });
    return Response.json({ ok: true, data: acct });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown database error";
    const cause = typeof e === "object" && e && "code" in e ? (e as { code?: string }).code : undefined;
    if (/no such table/i.test(String(msg))) {
      await ensureSchema();
      try {
        const body = (await req.json().catch(() => ({}))) as { name?: string };
        const user = await ensureDemoUser();
        const name = body.name?.trim() || "My Portfolio";
        const acct = await prisma.portfolioAccount.create({ data: { name, userId: user.id } });
        return Response.json({ ok: true, data: acct });
      } catch (e2) {
        const msg2 = e2 instanceof Error ? e2.message : "Unknown database error";
        const cause2 = typeof e2 === "object" && e2 && "code" in e2 ? (e2 as { code?: string }).code : undefined;
        return Response.json({ error: "Account creation failed", detail: msg2, code: cause2 }, { status: 500 });
      }
    }
    return Response.json({ error: "Account creation failed", detail: msg, code: cause }, { status: 500 });
  }
}
