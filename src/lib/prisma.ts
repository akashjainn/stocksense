import { PrismaClient } from "@prisma/client";
import { createClient as createLibsqlClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

// Resolve Turso connection info safely
function resolveTursoEnv() {
  // Prefer separate env vars, fallback to embedded format
  let url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  let token = process.env.TURSO_AUTH_TOKEN;
  
  // If we have a libsql URL but no separate token, try to extract from URL
  if (url?.startsWith("libsql://") && !token) {
    try {
      const u = new URL(url);
      const qToken = u.searchParams.get("authToken");
      if (qToken) {
        token = qToken;
        // Clean URL by removing authToken param for libsql client
        u.searchParams.delete("authToken");
        url = u.toString();
      }
    } catch {
      // ignore URL parse failures; use as-is
    }
  }
  
  return { url: url?.trim(), token: token?.trim() } as const;
}

function makePrisma(): PrismaClient {
  const { url, token } = resolveTursoEnv();

  if (url) {
    try {
      console.log(`[Prisma] Turso adapter init. url? ${Boolean(url)} libsql? ${url.startsWith("libsql://")} token? ${Boolean(token)}`);
      console.log(`[Prisma] URL length: ${url.length}, first 30 chars: ${url.substring(0, 30)}...`);
      const libsql = createLibsqlClient({ url, authToken: token });
      const adapter = new PrismaLibSQL(libsql as unknown as never);
      const client = new PrismaClient({ adapter } as unknown as Record<string, unknown> as never);
      console.log("[Prisma] Successfully created Turso adapter client");
      return client;
    } catch (e) {
      console.error("[Prisma] Turso adapter failed, falling back to SQLite PrismaClient:", (e as Error)?.message);
      return new PrismaClient({ datasources: { db: { url: "file:./prisma/dev.db" } } });
    }
  }

  // Default: SQLite client pointing to local file to avoid env dependency
  console.log("[Prisma] No Turso URL found, using default SQLite PrismaClient");
  return new PrismaClient({ datasources: { db: { url: "file:./prisma/dev.db" } } });
}

export type PrismaConnectionMode = "turso" | "sqlite";
let mode: PrismaConnectionMode = "sqlite";

let prismaInstance: PrismaClient | undefined;
function getOrCreatePrisma(): PrismaClient {
  if (!prismaInstance) {
    const { url } = (resolveTursoEnv?.() ?? { url: undefined });
    mode = url ? "turso" : "sqlite";
    prismaInstance = makePrisma();
  }
  return prismaInstance;
}

export const prismaMode = () => mode;

// Lazy proxy: construct PrismaClient on first property access
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getOrCreatePrisma() as unknown as Record<string, unknown>;
    const val = client[prop as string];
    // Bind methods to the underlying client
    if (typeof val === "function") {
      return (val as Function).bind(client);
    }
    return val;
  },
}) as unknown as PrismaClient;
