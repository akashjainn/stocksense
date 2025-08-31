import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Direct libsql client for Turso
function getTursoClient() {
  const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url || !authToken) {
    throw new Error("Missing TURSO credentials");
  }
  
  return createClient({ url, authToken });
}

async function ensureDemoUser() {
  const db = getTursoClient();
  
  // Check if demo user exists
  let result = await db.execute({
    sql: "SELECT id FROM User WHERE email = ?",
    args: ["demo@stocksense.local"]
  });
  
  if (result.rows.length > 0) {
    return { id: result.rows[0].id as string };
  }
  
  // Create demo user
  result = await db.execute({
    sql: "INSERT INTO User (id, email, name, createdAt) VALUES (lower(hex(randomblob(16))), ?, ?, datetime('now')) RETURNING id",
    args: ["demo@stocksense.local", "Demo User"]
  });
  
  return { id: result.rows[0].id as string };
}

export async function GET() {
  try {
    const db = getTursoClient();
    const result = await db.execute("SELECT id, name, userId, createdAt FROM PortfolioAccount ORDER BY createdAt ASC");
    
    const accounts = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      userId: row.userId,
      createdAt: row.createdAt
    }));
    
    return NextResponse.json({ data: accounts });
  } catch (e) {
    const error = e as Error;
    console.error("[/api/accounts-direct] GET failed:", error);
    return NextResponse.json({ 
      error: "Accounts query failed", 
      detail: error.message 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const user = await ensureDemoUser();
    const name = body.name?.trim() || "My Portfolio";
    
    const db = getTursoClient();
    const result = await db.execute({
      sql: `INSERT INTO PortfolioAccount (id, userId, name, baseCcy, createdAt) 
            VALUES (lower(hex(randomblob(16))), ?, ?, 'USD', datetime('now')) 
            RETURNING id, name, userId, createdAt`,
      args: [user.id, name]
    });
    
    if (!result.rows[0]?.id) {
      console.error("[/api/accounts-direct] Created account missing id:", result.rows[0]);
      return NextResponse.json({ error: "Account missing id" }, { status: 500 });
    }
    
    const account = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      userId: result.rows[0].userId,
      createdAt: result.rows[0].createdAt
    };
    
    return NextResponse.json({ data: account }, { status: 201 });
  } catch (e) {
    const error = e as Error;
    console.error("[/api/accounts-direct] POST failed:", error);
    return NextResponse.json({ 
      error: "Account creation failed", 
      detail: error.message 
    }, { status: 500 });
  }
}
