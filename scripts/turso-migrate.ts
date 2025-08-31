import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";

function getLibsqlConfig() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");
  let url = raw;
  let authToken = process.env.TURSO_AUTH_TOKEN;
  try {
    const u = new URL(raw);
    authToken = authToken ?? u.searchParams.get("authToken") ?? undefined;
    if (authToken) {
      u.searchParams.delete("authToken");
      url = u.toString();
    }
  } catch {
    // ignore parse errors, use raw
  }
  return { url, authToken } as const;
}

async function applyMigrations() {
  const { url, authToken } = getLibsqlConfig();
  const client = createClient({ url, authToken });
  const migRoot = path.resolve(process.cwd(), "prisma", "migrations");
  if (!fs.existsSync(migRoot)) {
    console.log("No migrations directory found at:", migRoot);
    return;
  }
  const dirs = fs
    .readdirSync(migRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const d of dirs) {
    const file = path.join(migRoot, d, "migration.sql");
    if (!fs.existsSync(file)) continue;
    const sql = fs.readFileSync(file, "utf8");
    console.log(`Applying migration: ${d}`);
    const statements = sql
      .split(/;\s*\n/) // naive split on semicolon + newline
      .map((s) => s.trim())
      .filter((s) => s.length && !s.startsWith("--"));
    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch (e: any) {
        const msg = e?.message || String(e);
        // Ignore idempotent errors when objects already exist
        if (/already exists/i.test(msg) || /duplicate column/i.test(msg)) {
          continue;
        }
        console.error("Failed statement:\n", stmt);
        throw e;
      }
    }
  }
  console.log("Turso migrations applied successfully.");
}

applyMigrations().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
