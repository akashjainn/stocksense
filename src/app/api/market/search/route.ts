import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchResult = {
  symbol: string;
  name: string;
  exchange: string;
  type?: string;
};

// Fallback search results for when FMP is not available
const POPULAR_STOCKS: SearchResult[] = [
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
  { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ" },
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" },
  { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ" },
  { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ" },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ" },
  { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ" },
  { symbol: "NFLX", name: "Netflix Inc.", exchange: "NASDAQ" },
  { symbol: "AMD", name: "Advanced Micro Devices Inc.", exchange: "NASDAQ" },
  { symbol: "AVGO", name: "Broadcom Inc.", exchange: "NASDAQ" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", exchange: "NYSE" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", exchange: "NASDAQ" },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim().toUpperCase();
  
  if (!query) {
    return NextResponse.json([]);
  }

  try {
    // Try FMP first if API key is available
    const FMP_KEY = process.env.FMP_KEY;
    if (FMP_KEY) {
      // Use new stable search-name endpoint (company symbol/name search)
      const url = `https://financialmodelingprep.com/stable/search-name?query=${encodeURIComponent(query)}&limit=20&exchange=NASDAQ&apikey=${FMP_KEY}`;
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const results: SearchResult[] = Array.isArray(data) ? data.map((item: any) => ({
          symbol: item.symbol,
          name: item.name || item.companyName || item.symbol,
          exchange: item.exchange || item.exchangeFullName || 'NASDAQ',
          type: item.type,
        })) : [];
        return NextResponse.json(results);
      }
    }

    // Fallback to local search
    const filtered = POPULAR_STOCKS.filter(
      stock => 
        stock.symbol.includes(query) || 
        stock.name.toUpperCase().includes(query)
    );

    return NextResponse.json(filtered.slice(0, 10));
  } catch (error) {
    console.error("Search API error:", error);
    
    // Fallback search on error
    const filtered = POPULAR_STOCKS.filter(
      stock => 
        stock.symbol.includes(query) || 
        stock.name.toUpperCase().includes(query)
    );

    return NextResponse.json(filtered.slice(0, 10));
  }
}