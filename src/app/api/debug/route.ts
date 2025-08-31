import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    DATABASE_URL: process.env.DATABASE_URL ? "SET" : "UNDEFINED",
    NODE_ENV: process.env.NODE_ENV,
    envKeys: Object.keys(process.env).filter(k => k.includes('DATABASE')),
    cwd: process.cwd()
  });
}
