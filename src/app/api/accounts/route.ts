import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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
    console.log("[ensureSchema] Bootstrapping database schema...");
    const migPath = path.resolve(process.cwd(), "prisma", "migrations", "20250829142012_init", "migration.sql");
    
    if (!fs.existsSync(migPath)) {
      console.error("[ensureSchema] Migration file not found:", migPath);
      return;
    }
    
    const sql = fs.readFileSync(migPath, "utf8");
    // Split on semicolon followed by newline, but preserve CREATE TABLE blocks
    const statements = sql
      .split(/;\s*(?=\n|$)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));
    
    console.log(`[ensureSchema] Executing ${statements.length} statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt || stmt.length < 5) continue;
      
      try {
        console.log(`[ensureSchema] Executing statement ${i + 1}: ${stmt.substring(0, 50)}...`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).$executeRawUnsafe(stmt);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Ignore "already exists" errors but log others
        if (!/already exists|table .* already exists/i.test(msg)) {
          console.error(`[ensureSchema] Statement ${i + 1} failed:`, msg);
          console.error(`[ensureSchema] Failed statement: ${stmt}`);
          // Don't throw - continue with other statements
        } else {
          console.log(`[ensureSchema] Statement ${i + 1} skipped (already exists)`);
        }
      }
    }
    console.log("[ensureSchema] Schema bootstrap completed");
  } catch (e) {
    console.error("[ensureSchema] Schema bootstrap failed:", e);
  }
}

function shouldBootstrapSchema(err: unknown): boolean {
  const url = process.env.DATABASE_URL || "";
  if (!url.startsWith("file:")) return false; // only auto-bootstrap for SQLite
  const msg = err instanceof Error ? err.message : String(err);
  // Prisma code P2021: table does not exist
  const isP2021 =
    typeof err === "object" && err !== null && "code" in err && (err as Prisma.PrismaClientKnownRequestError).code === "P2021";
  return /no such table/i.test(msg) || /does not exist/i.test(msg) || Boolean(isP2021);
}

export async function GET() {
  try {
    const accounts = await prisma.portfolioAccount.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json({ data: accounts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown database error";
    console.error("[/api/accounts] GET failed:", e);
  if (shouldBootstrapSchema(e)) {
      await ensureSchema();
      try {
        const accounts = await prisma.portfolioAccount.findMany({ orderBy: { createdAt: "asc" } });
        return NextResponse.json({ data: accounts });
      } catch (e2) {
        const msg2 = e2 instanceof Error ? e2.message : "Unknown database error";
        console.error("[/api/accounts] GET retry failed:", e2);
        return NextResponse.json({ error: "Accounts query failed", detail: msg2 }, { status: 500 });
      }
    }
    return NextResponse.json({ error: "Accounts query failed", detail: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const user = await ensureDemoUser();
    const name = body.name?.trim() || "My Portfolio";
    const acct = await prisma.portfolioAccount.create({
      data: { name, userId: user.id },
      // Ensure UI-critical fields are present
      select: { id: true, name: true, userId: true, createdAt: true },
    });

    if (!acct?.id) {
      console.error("[/api/accounts] Created account missing id:", acct);
      return NextResponse.json({ error: "Account missing id" }, { status: 500 });
    }

    // Keep envelope with { data } to match frontend expectations
    return NextResponse.json({ data: acct }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown database error";
    const cause = typeof e === "object" && e && "code" in e ? (e as { code?: string }).code : undefined;
    console.error("[/api/accounts] POST failed:", e);
  if (shouldBootstrapSchema(e)) {
      await ensureSchema();
      try {
        const body = (await req.json().catch(() => ({}))) as { name?: string };
        const user = await ensureDemoUser();
        const name = body.name?.trim() || "My Portfolio";
        const acct = await prisma.portfolioAccount.create({
          data: { name, userId: user.id },
          select: { id: true, name: true, userId: true, createdAt: true },
        });
        if (!acct?.id) {
          console.error("[/api/accounts] Created account missing id (retry):", acct);
          return NextResponse.json({ error: "Account missing id" }, { status: 500 });
        }
        return NextResponse.json({ data: acct }, { status: 201 });
      } catch (e2) {
        const msg2 = e2 instanceof Error ? e2.message : "Unknown database error";
        const cause2 = typeof e2 === "object" && e2 && "code" in e2 ? (e2 as { code?: string }).code : undefined;
        console.error("[/api/accounts] POST retry failed:", e2);
        return NextResponse.json({ error: "Account creation failed", detail: msg2, code: cause2 }, { status: 500 });
      }
    }
    return NextResponse.json({ error: "Account creation failed", detail: msg, code: cause }, { status: 500 });
  }
}
