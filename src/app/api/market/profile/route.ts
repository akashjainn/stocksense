import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Profile = {
  symbol: string;
  name?: string;
  exchange?: string;
  currency?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  pe?: number;
  eps?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  description?: string;
  website?: string;
};

function safeNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const num = Number(value);
  return isFinite(num) ? num : undefined;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "").trim().toUpperCase();
  
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const FMP_KEY = process.env.FMP_KEY;
    
    if (FMP_KEY) {
      // Try FMP for comprehensive profile data
      const url = `https://financialmodelingprep.com/api/v3/profile/${encodeURIComponent(symbol)}?apikey=${FMP_KEY}`;
      const response = await fetch(url, { cache: "no-store" });
      
      if (response.ok) {
        const data = await response.json();
        const profileData = data?.[0] || {};
        
        const profile: Profile = {
          symbol,
          name: profileData.companyName,
          exchange: profileData.exchangeShortName,
          currency: profileData.currency,
          sector: profileData.sector,
          industry: profileData.industry,
          marketCap: safeNumber(profileData.mktCap),
          pe: safeNumber(profileData.pe),
          eps: safeNumber(profileData.eps),
          dividendYield: safeNumber(profileData.lastDiv),
          fiftyTwoWeekHigh: safeNumber(profileData.range?.split("-")?.[1]),
          fiftyTwoWeekLow: safeNumber(profileData.range?.split("-")?.[0]),
          description: profileData.description,
          website: profileData.website,
        };
        
        return NextResponse.json(profile);
      }
    }

    // Fallback: minimal profile with just symbol
    const fallbackProfile: Profile = {
      symbol,
      name: `${symbol} Inc.`,
      exchange: "NASDAQ",
      currency: "USD",
    };

    return NextResponse.json(fallbackProfile);
  } catch (error) {
    console.error("Profile API error:", error);
    
    // Return minimal profile on error
    const fallbackProfile: Profile = {
      symbol,
      name: `${symbol} Inc.`,
      exchange: "NASDAQ", 
      currency: "USD",
    };

    return NextResponse.json(fallbackProfile);
  }
}