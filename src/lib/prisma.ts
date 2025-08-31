import { PrismaClient } from "@prisma/client";
import { createClient as createLibsqlClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

// Resolve Turso connection info safely
function resolveTursoEnv() {
  const rawUrl = process.env.TURSO_DATABASE_URL || (process.env.DATABASE_URL?.startsWith("libsql://") ? process.env.DATABASE_URL : undefined);
  const url = rawUrl?.trim();
  let token = process.env.TURSO_AUTH_TOKEN?.trim();

  // If token not provided separately, try to read from the URL query
  if (url && !token) {
    try {
      const u = new URL(url);
      const qToken = u.searchParams.get("authToken");
      if (qToken) token = qToken;
    } catch {
      // ignore URL parse failures; libsql client might still handle it
    }
  }
  return { url, token } as const;
}

function makePrisma(): PrismaClient {
  const { url, token } = resolveTursoEnv();

  if (url) {
    try {
      // Minimal visibility without leaking secrets
      console.log(`[Prisma] Turso adapter init. url? ${Boolean(url)} libsql? ${url.startsWith("libsql://")} token? ${Boolean(token)}`);
      console.log(`[Prisma] URL length: ${url.length}, first 30 chars: ${url.substring(0, 30)}...`);
      const libsql = createLibsqlClient({ url, authToken: token });
      // Cast due to types mismatch between adapter/client versions
      const adapter = new PrismaLibSQL(libsql as unknown as never);
      const client = new PrismaClient({ adapter } as unknown as Record<string, unknown> as never);
      console.log("[Prisma] Successfully created Turso adapter client");
      return client;
    } catch (e) {
      // Fallback to default Prisma if Turso init fails (e.g., URL_INVALID)
      console.error("[Prisma] Turso adapter failed, falling back to SQLite PrismaClient:", (e as Error)?.message);
      // Ensure no env var pollution for fallback
      return new PrismaClient({
        datasources: { db: { url: "file:./prisma/dev.db" } }
      });
    }
  }

  // Default: regular PrismaClient (uses sqlite file from schema / env)
  console.log("[Prisma] No Turso URL found, using default SQLite PrismaClient");
  return new PrismaClient({
    datasources: { db: { url: "file:./prisma/dev.db" } }
  });
}

export type PrismaConnectionMode = "turso" | "sqlite";
let mode: PrismaConnectionMode = "sqlite";

function makeTrackedPrisma(): PrismaClient {
  const { url } = (resolveTursoEnv?.() ?? { url: undefined });
  if (url) mode = "turso"; else mode = "sqlite";
  return makePrisma();
}

export const prismaMode = () => mode;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma: PrismaClient = globalForPrisma.prisma ?? makeTrackedPrisma();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
