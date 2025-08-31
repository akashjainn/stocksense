import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Test direct libsql connection without Prisma adapter
    const { createClient } = await import("@libsql/client");
    
    const tursoUrl = process.env.TURSO_DATABASE_URL || (process.env.DATABASE_URL?.startsWith("libsql://") ? process.env.DATABASE_URL : undefined);
    let tursoToken = process.env.TURSO_AUTH_TOKEN;
    
    if (tursoUrl && !tursoToken) {
      try {
        const u = new URL(tursoUrl);
        const q = u.searchParams.get("authToken");
        if (q) tursoToken = q;
      } catch {}
    }
    
    console.log(`[libsql-test] URL: ${Boolean(tursoUrl)}, token: ${Boolean(tursoToken)}`);
    
    if (!tursoUrl) {
      return NextResponse.json({ error: "No Turso URL configured" }, { status: 400 });
    }
    
    const client = createClient({ url: tursoUrl, authToken: tursoToken });
    const result = await client.execute("SELECT 1 as test");
    
    return NextResponse.json({ 
      success: true,
      result: result.rows,
      url: tursoUrl.substring(0, 30) + "...",
      hasToken: Boolean(tursoToken)
    });
  } catch (e) {
    const error = e as Error;
    console.error("[libsql-test] Error:", error);
    return NextResponse.json({ 
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
