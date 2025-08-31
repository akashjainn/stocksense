import { createClient } from "@libsql/client";

// Centralized function to get a Turso client
export function getDb() {
  const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    // This should not happen in production if env vars are set
    throw new Error("Missing Turso database credentials. Please set DATABASE_URL and TURSO_AUTH_TOKEN.");
  }

  return createClient({ url, authToken });
}