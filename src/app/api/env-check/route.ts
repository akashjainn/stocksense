import { NextResponse } from "next/server";

export async function GET() {
  const envCheck = {
    DATABASE_URL: process.env.DATABASE_URL ? "SET" : "UNDEFINED",
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? "SET" : "UNDEFINED", 
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? "SET" : "UNDEFINED",
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    deployment: process.env.VERCEL_URL || "local"
  };
  
  return NextResponse.json(envCheck);
}
