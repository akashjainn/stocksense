import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// Provide a default SQLite database URL for local/dev if not set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./prisma/dev.db";
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
