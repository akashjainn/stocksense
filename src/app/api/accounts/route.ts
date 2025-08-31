import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
// removed unused imports

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
    console.log("[ensureSchema] Attempting to push schema to database...");
    
    // Use Prisma's db push instead of raw SQL for more reliability
    const { spawn } = await import("child_process");
    
    // Run prisma db push programmatically
    const pushProcess = spawn("npx", ["prisma", "db", "push", "--accept-data-loss"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, DATABASE_URL: url }
    });
    
    let output = "";
    let errorOutput = "";
    
    pushProcess.stdout?.on("data", (data) => {
      output += data.toString();
    });
    
    pushProcess.stderr?.on("data", (data) => {
      errorOutput += data.toString();
    });
    
    await new Promise((resolve, reject) => {
      pushProcess.on("close", (code) => {
        if (code === 0) {
          console.log("[ensureSchema] Schema push successful:", output);
          resolve(void 0);
        } else {
          console.error("[ensureSchema] Schema push failed:", errorOutput);
          reject(new Error(`Prisma push failed with code ${code}`));
        }
      });
    });
    
  } catch (e) {
    console.error("[ensureSchema] Schema bootstrap failed:", e);
    // Fallback: try to create just the essential tables manually
    try {
      console.log("[ensureSchema] Attempting fallback table creation...");
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT,
          "email" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PortfolioAccount" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "baseCcy" TEXT NOT NULL DEFAULT 'USD',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);
      
      console.log("[ensureSchema] Fallback table creation completed");
    } catch (fallbackErr) {
      console.error("[ensureSchema] Fallback failed too:", fallbackErr);
    }
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
