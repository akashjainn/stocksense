import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export async function GET() {
  try {
    // Test direct Turso connection
    const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    console.log(`[turso-diag] URL: ${Boolean(url)}, token: ${Boolean(authToken)}`);
    console.log(`[turso-diag] URL pattern: ${url?.substring(0, 30)}...`);
    
    if (!url || !authToken) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Missing Turso credentials',
        has_url: Boolean(url),
        has_token: Boolean(authToken)
      }, { status: 500 });
    }
    
    const db = createClient({ url, authToken });
    
    // Test basic connectivity
    const ping = await db.execute('SELECT 1 as ok');
    
    // Check if tables exist
    const tables = await db.execute(`
      SELECT name FROM sqlite_schema 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    // Test if we can write (check for read-only issues)
    let writeTest = null;
    try {
      writeTest = await db.execute('SELECT datetime("now") as test_write_ts');
    } catch (e: any) {
      writeTest = { error: e.message };
    }
    
    return NextResponse.json({ 
      ok: true, 
      ping: ping.rows,
      tables: tables.rows,
      writeTest,
      url_preview: url.substring(0, 40) + '...'
    });
  } catch (e: any) {
    console.error('[turso-diag] Error:', e);
    return NextResponse.json({ 
      ok: false, 
      error: e.message,
      code: e.code
    }, { status: 500 });
  }
}
