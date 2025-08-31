import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";
import os from "os";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// Create the appropriate client based on environment
function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
  
  console.log("[DB] Creating Prisma client...");
  console.log("[DB] DATABASE_URL exists:", !!process.env.DATABASE_URL);
  console.log("[DB] DATABASE_URL starts with libsql:", databaseUrl.startsWith("libsql://"));
  console.log("[DB] NODE_ENV:", process.env.NODE_ENV);
  
  if (databaseUrl.startsWith("libsql://")) {
    // Use Turso/libSQL
    console.log("[DB] Using Turso/libSQL adapter");
    console.log("[DB] Database URL length:", databaseUrl.length);
    console.log("[DB] Database URL preview:", databaseUrl.substring(0, 50) + "...");
    try {
      console.log("[DB] About to create libSQL client with URL");
      // Some @libsql/client versions expect authToken as a separate option
      // rather than as a query param. Parse it defensively.
      let urlForClient = databaseUrl;
      let authToken: string | undefined = process.env.TURSO_AUTH_TOKEN;
      try {
        const parsed = new URL(databaseUrl);
        // Prefer explicit env var over URL param
        authToken = authToken ?? (parsed.searchParams.get("authToken") ?? undefined);
        if (authToken) {
          parsed.searchParams.delete("authToken");
          urlForClient = parsed.toString();
          console.log("[DB] Extracted authToken from DATABASE_URL and cleaned query params");
        }
      } catch (e) {
        console.warn("[DB] Failed to parse DATABASE_URL with URL():", (e as Error)?.message);
      }

      const libsql = createClient({
        url: urlForClient,
        // Passing explicitly helps older/newer libsql clients
        authToken,
      });
      console.log("[DB] libSQL client created successfully");
      // @ts-ignore - Known type compatibility issue with adapter
      const adapter = new PrismaLibSQL(libsql);
      console.log("[DB] Adapter created successfully");
      const client = new PrismaClient({ 
        // @ts-ignore - Bypass TypeScript issues with adapter
        adapter,
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
      });
      console.log("[DB] PrismaClient created successfully");
      return client;
    } catch (error) {
      console.error("[DB] Failed to create libSQL client:", error);
      throw error;
    }
  } else {
    console.log("[DB] Using local SQLite with URL:", databaseUrl);
    // Use local SQLite with file path handling for serverless
    let finalUrl = databaseUrl;
    
    try {
      const isSqlite = databaseUrl.startsWith("file:");
      const isProdLike = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
      const tmpDir = os.tmpdir();
      const alreadyTmp = databaseUrl.includes(tmpDir);

      if (isSqlite && isProdLike && !alreadyTmp) {
        const srcPath = path.resolve(process.cwd(), "prisma", "dev.db");
        const dstPath = path.join(tmpDir, "dev.db");
        try {
          if (!fs.existsSync(dstPath)) {
            if (fs.existsSync(srcPath)) {
              fs.copyFileSync(srcPath, dstPath);
            } else {
              fs.writeFileSync(dstPath, "");
            }
          }
          finalUrl = `file:${dstPath}`;
        } catch (e) {
          console.error("SQLite init to tmp dir failed:", e);
        }
      }
    } catch {
      // ignore
    }

    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
      datasources: { db: { url: finalUrl } },
    });
  }
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
