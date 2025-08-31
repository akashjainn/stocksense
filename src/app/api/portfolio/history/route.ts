import { prisma } from "@/lib/db";
import { buildProvider } from "@/lib/providers/prices";
import { getDailyBars } from "@/lib/market/providers/alpaca";
import dayjs from "dayjs";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("accountId") || undefined;
  const period = req.nextUrl.searchParams.get("period") || "6M"; // 1M, 3M, 6M, 1Y, ALL
  
  try {
    // Get all transactions for the account
    const txns = await prisma.transaction.findMany({
      where: accountId ? { accountId } : undefined,
      orderBy: { tradeDate: "asc" },
      include: { security: true },
    });

    // Calculate portfolio composition over time
    const portfolioHistory = calculatePortfolioHistory(txns);
    
    // Get historical prices for current holdings
    const currentHoldings = getCurrentHoldings(txns);
    const symbols = Array.from(currentHoldings.keys());
    
    if (symbols.length === 0) {
      return Response.json({
        portfolioHistory: [],
        benchmark: [],
        totalValue: 0,
        totalCost: 0,
        totalPnl: 0,
        totalPnlPct: 0
      });
    }

    // Fetch historical data
    const { fromDate, toDate } = getPeriodDates(period);
    const historicalData = await getHistoricalData(symbols, fromDate, toDate);
    
    // Calculate portfolio value over time
    const portfolioValues = calculatePortfolioValues(portfolioHistory, historicalData);
    
    // Get benchmark data (S&P 500 equivalent)
    const benchmarkData = await getBenchmarkData(fromDate, toDate);
    
    // Calculate current totals
    const currentPrices = await getCurrentPrices(symbols);
    const { totalValue, totalCost, totalPnl, totalPnlPct } = calculateCurrentTotals(currentHoldings, currentPrices);

    return Response.json({
      portfolioHistory: portfolioValues,
      benchmark: benchmarkData,
      totalValue,
      totalCost,
      totalPnl,
      totalPnlPct,
      period
    });

  } catch (error) {
    console.error("Error fetching portfolio history:", error);
    return Response.json({ error: "Failed to fetch portfolio history" }, { status: 500 });
  }
}

function getPeriodDates(period: string) {
  const now = dayjs();
  let fromDate: dayjs.Dayjs;
  
  switch (period) {
    case "1M":
      fromDate = now.subtract(1, "month");
      break;
    case "3M":
      fromDate = now.subtract(3, "month");
      break;
    case "6M":
      fromDate = now.subtract(6, "month");
      break;
    case "1Y":
      fromDate = now.subtract(1, "year");
      break;
    case "ALL":
      fromDate = now.subtract(5, "year"); // Limit to 5 years for performance
      break;
    default:
      fromDate = now.subtract(6, "month");
  }
  
  return {
    fromDate: fromDate.format("YYYY-MM-DD"),
    toDate: now.format("YYYY-MM-DD")
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCurrentHoldings(txns: any[]) {
  const holdings = new Map<string, { symbol: string; qty: number; cost: number; avgPrice: number }>();
  
  for (const t of txns) {
    if (t.type === "CASH") continue;
    
    const sym = t.security?.symbol;
    if (!sym) continue;
    
    const qty = t.qty != null ? Number(t.qty) : 0;
    const px = t.price != null ? Number(t.price) : 0;
    
    if (t.type === "BUY") {
      const h = holdings.get(sym) || { symbol: sym, qty: 0, cost: 0, avgPrice: 0 };
      const newQty = h.qty + qty;
      const newCost = h.cost + (qty * px);
      h.qty = newQty;
      h.cost = newCost;
      h.avgPrice = newQty > 0 ? newCost / newQty : 0;
      holdings.set(sym, h);
    } else if (t.type === "SELL") {
      const h = holdings.get(sym);
      if (h) {
        h.qty -= qty;
        if (h.qty <= 0) {
          holdings.delete(sym);
        }
      }
    }
  }
  
  return holdings;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculatePortfolioHistory(txns: any[]) {
  // Build a timeline of portfolio composition changes
  const timeline: Array<{
    date: string;
    holdings: Map<string, { qty: number; cost: number }>;
  }> = [];
  
  const holdings = new Map<string, { qty: number; cost: number }>();
  let currentDate = "";
  
  for (const t of txns) {
    const tradeDate = dayjs(t.tradeDate).format("YYYY-MM-DD");
    
    if (tradeDate !== currentDate) {
      if (currentDate) {
        timeline.push({
          date: currentDate,
          holdings: new Map(holdings)
        });
      }
      currentDate = tradeDate;
    }
    
    if (t.type === "CASH") continue;
    
    const sym = t.security?.symbol;
    if (!sym) continue;
    
    const qty = t.qty != null ? Number(t.qty) : 0;
    const px = t.price != null ? Number(t.price) : 0;
    
    if (t.type === "BUY") {
      const h = holdings.get(sym) || { qty: 0, cost: 0 };
      h.qty += qty;
      h.cost += qty * px;
      holdings.set(sym, h);
    } else if (t.type === "SELL") {
      const h = holdings.get(sym);
      if (h) {
        const avgCost = h.qty > 0 ? h.cost / h.qty : 0;
        h.qty -= qty;
        h.cost -= qty * avgCost;
        if (h.qty <= 0) {
          holdings.delete(sym);
        }
      }
    }
  }
  
  if (currentDate) {
    timeline.push({
      date: currentDate,
      holdings: new Map(holdings)
    });
  }
  
  return timeline;
}

async function getHistoricalData(symbols: string[], fromDate: string, toDate: string) {
  try {
    const dataBySymbol = new Map<string, Map<string, number>>();
    
    // Fetch historical data for each symbol individually
    for (const symbol of symbols) {
      try {
        const historicalBars = await getDailyBars([symbol], fromDate, toDate);
        const symbolData = new Map<string, number>();
        
        for (const bar of historicalBars) {
          const date = dayjs(bar.t).format("YYYY-MM-DD");
          symbolData.set(date, bar.c);
        }
        
        dataBySymbol.set(symbol, symbolData);
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        // Set empty data for this symbol
        dataBySymbol.set(symbol, new Map());
      }
    }
    
    return dataBySymbol;
  } catch (error) {
    console.error("Error fetching historical data:", error);
    return new Map();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculatePortfolioValues(portfolioHistory: any[], historicalData: Map<string, Map<string, number>>) {
  const values: Array<{ date: string; value: number }> = [];
  
  for (const snapshot of portfolioHistory) {
    let totalValue = 0;
    
    for (const [symbol, holding] of snapshot.holdings) {
      const symbolData = historicalData.get(symbol);
      const price = symbolData?.get(snapshot.date);
      
      if (price && holding.qty > 0) {
        totalValue += holding.qty * price;
      }
    }
    
    values.push({
      date: snapshot.date,
      value: totalValue
    });
  }
  
  return values;
}

async function getBenchmarkData(fromDate: string, toDate: string) {
  try {
    // Use SPY as S&P 500 benchmark
    const benchmarkBars = await getDailyBars(["SPY"], fromDate, toDate);
    
    return benchmarkBars.map(bar => ({
      date: dayjs(bar.t).format("YYYY-MM-DD"),
      value: bar.c
    }));
  } catch (error) {
    console.error("Error fetching benchmark data:", error);
    return [];
  }
}

async function getCurrentPrices(symbols: string[]) {
  const provider = buildProvider();
  const quotes = await provider.getQuote(symbols);
  
  const prices = new Map<string, number>();
  for (const quote of quotes) {
    if (quote.price != null) {
      prices.set(quote.symbol, quote.price);
    }
  }
  
  return prices;
}

function calculateCurrentTotals(holdings: Map<string, any>, currentPrices: Map<string, number>) {
  let totalValue = 0;
  let totalCost = 0;
  
  for (const [symbol, holding] of holdings) {
    const currentPrice = currentPrices.get(symbol);
    if (currentPrice && holding.qty > 0) {
      totalValue += holding.qty * currentPrice;
      totalCost += holding.cost;
    }
  }
  
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  
  return { totalValue, totalCost, totalPnl, totalPnlPct };
}
