import { PrismaClient } from "@prisma/client";
import { createClient as createLibsqlClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

// Prefer explicit Turso env vars; fall back to DATABASE_URL if it’s already libsql://
const tursoUrl = process.env.TURSO_DATABASE_URL || (process.env.DATABASE_URL?.startsWith("libsql://") ? process.env.DATABASE_URL : undefined);
const tursoToken = process.env.TURSO_AUTH_TOKEN;

function makePrisma(): PrismaClient {
  if (tursoUrl) {
    try {
      const startsWith = tursoUrl.startsWith("libsql://");
      // Minimal visibility without leaking secrets
      console.log(`[Prisma] Using Turso adapter. URL present: ${Boolean(tursoUrl)}, startsWith libsql: ${startsWith}, token present: ${Boolean(tursoToken)}`);
    } catch {}
    // Pass authToken explicitly; also keep URL unchanged (some versions expect query intact)
  const libsql = createLibsqlClient({ url: tursoUrl, authToken: tursoToken });
  const adapter = new PrismaLibSQL(libsql as unknown as never);
    // Note: adapter option is supported with driverAdapters preview
  return new PrismaClient({ adapter } as unknown as Record<string, unknown> as never);
  }
  // Default: regular PrismaClient (uses sqlite file from schema / env)
  return new PrismaClient();
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma: PrismaClient = globalForPrisma.prisma ?? makePrisma();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
