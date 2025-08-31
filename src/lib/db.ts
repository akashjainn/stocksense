import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import os from "os";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// Provide a default SQLite database URL for local/dev if not set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./prisma/dev.db";
}

// In serverless/production, SQLite must use a writable path. Copy to a temp dir and point Prisma to it.
try {
  const url = process.env.DATABASE_URL || "";
  const isSqlite = url.startsWith("file:");
  const isProdLike = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const tmpDir = os.tmpdir();
  const alreadyTmp = url.includes(tmpDir);

  if (isSqlite && isProdLike && !alreadyTmp) {
    const srcPath = path.resolve(process.cwd(), "prisma", "dev.db");
    const dstPath = path.join(tmpDir, "dev.db");
    try {
      if (!fs.existsSync(dstPath)) {
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, dstPath);
        } else {
          // Create an empty file; tables will be created by the schema bootstrap
          fs.writeFileSync(dstPath, "");
        }
      }
      process.env.DATABASE_URL = `file:${dstPath}`;
    } catch (e) {
      // Log but don't crash; Prisma will use whatever URL is set and error will be returned by API
      console.error("SQLite init to tmp dir failed:", e);
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
