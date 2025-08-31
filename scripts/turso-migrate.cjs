// Simple migration applier for Turso/libSQL using the Prisma migration SQL
require('dotenv').config();
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
let authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !url.startsWith('libsql://')) {
  console.log('[turso-migrate] DATABASE_URL is not libsql://, skipping');
  process.exit(0);
}

(async () => {
  // Extract authToken from URL if embedded
  try {
    const u = new URL(url);
    authToken = authToken || u.searchParams.get('authToken') || undefined;
  } catch {}

  const client = createClient({ url, authToken });
  const migrationDir = path.resolve('prisma/migrations');
  if (!fs.existsSync(migrationDir)) {
    console.log('[turso-migrate] No prisma/migrations directory, nothing to apply');
    process.exit(0);
  }

  const dirs = fs
    .readdirSync(migrationDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const dir of dirs) {
    const sqlPath = path.join(migrationDir, dir, 'migration.sql');
    if (!fs.existsSync(sqlPath)) continue;
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split on semicolons that end statements; keep it simple
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('--'));

    console.log(`[turso-migrate] Applying migration ${dir} (${statements.length} statements)`);
    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        if (/already exists|duplicate key|SQLITE_CONSTRAINT/i.test(msg)) {
          // idempotent-ish
          continue;
        }
        console.error(`[turso-migrate] Error executing statement: ${msg}`);
        console.error(stmt);
        process.exit(1);
      }
    }
  }

  console.log('[turso-migrate] Done');
})();
