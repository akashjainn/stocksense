import { NextResponse } from "next/server";
import { prisma, prismaMode } from "@/lib/prisma";

export async function GET() {
  try {
    // Test basic connectivity
    const mode = prismaMode();
    console.log(`[accounts-test] Prisma mode: ${mode}`);
    
    // Simple connectivity test
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log(`[accounts-test] Raw query result:`, result);
    
    // Try to get accounts
    const accounts = await prisma.portfolioAccount.findMany({ 
      take: 5,
      orderBy: { createdAt: "desc" }
    });
    
    return NextResponse.json({ 
      success: true,
      mode,
      accountCount: accounts.length,
      accounts: accounts.map(a => ({ id: a.id, name: a.name }))
    });
  } catch (e) {
    const error = e as Error;
    console.error("[accounts-test] Error:", error);
    return NextResponse.json({ 
      success: false,
      error: error.message,
      mode: prismaMode()
    }, { status: 500 });
  }
}
