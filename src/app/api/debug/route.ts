import { NextResponse } from "next/server";
import { prismaMode } from "@/lib/prisma";

export async function GET() {
  return NextResponse.json({
    DATABASE_URL: process.env.DATABASE_URL ? "SET" : "UNDEFINED",
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? "SET" : "UNDEFINED",
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? "SET" : "UNDEFINED",
    NODE_ENV: process.env.NODE_ENV,
    envKeys: Object.keys(process.env).filter(k => k.includes('DATABASE')),
  cwd: process.cwd(),
  prismaMode: prismaMode()
  });
}
