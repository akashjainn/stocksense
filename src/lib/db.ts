import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// Provide a default SQLite database URL for local/dev if not set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./prisma/dev.db";
}

// In serverless/production, SQLite must use a writable path. Copy to /tmp and point Prisma to it.
try {
  const url = process.env.DATABASE_URL || "";
  const isSqlite = url.startsWith("file:");
  const isProdLike = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const alreadyTmp = url.includes("/tmp/");
  if (isSqlite && isProdLike && !alreadyTmp) {
    const srcPath = path.resolve(process.cwd(), "prisma", "dev.db");
    const dstPath = "/tmp/dev.db";
    try {
      if (!fs.existsSync(dstPath)) {
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, dstPath);
        } else {
          // Create an empty file; expected tables must already exist in the bundled DB for writes to work
          fs.writeFileSync(dstPath, "");
        }
      }
      process.env.DATABASE_URL = `file:${dstPath}`;
    } catch (e) {
      // Log but don't crash; Prisma will use whatever URL is set and error will be returned by API
      console.error("SQLite init to /tmp failed:", e);
    }
  }
} catch {
  // ignore
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: process.env.DATABASE_URL
      ? { db: { url: process.env.DATABASE_URL } }
      : undefined,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
