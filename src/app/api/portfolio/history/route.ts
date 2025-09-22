import { getMongoDb } from "@/lib/mongodb";
import { buildProvider } from "@/lib/providers/prices";
import {
  getCandlesMapCached,
  getQuotesCached,
  getLatestClose,
} from "@/lib/pricingCache";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { NextRequest, NextResponse } from "next/server";

dayjs.extend(isSameOrBefore);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("accountId") || undefined;
  const period = req.nextUrl.searchParams.get("period") || "6M"; // 1M, 3M, 6M, 1Y, ALL

  try {
    console.log(`[Portfolio History] Starting request for accountId: ${accountId}, period: ${period}`);
    
    // Get all transactions for the account
    const db = await getMongoDb();
    const rawTxns = await db
      .collection("transactions")
      .find(accountId ? { accountId } : {}, { sort: { tradeDate: 1 } })
      .toArray();
    // Normalize to Transaction[] shape (defensive picks of required fields)
    const txns: Transaction[] = rawTxns.map((r: any) => ({
      type: r.type,
      symbol: r.symbol,
      security: r.security ? { symbol: r.security.symbol } : undefined,
      qty: r.qty,
      price: r.price,
      tradeDate: r.tradeDate,
    }));

  console.log("[Portfolio History] Found transactions:", txns.length);

    if (txns.length === 0) {
      console.log("[Portfolio History] No transactions found, returning empty data");
      return NextResponse.json({
        portfolioHistory: [],
        benchmark: [],
        totalValue: 0,
        totalCost: 0,
        totalPnl: 0,
        totalPnlPct: 0,
      });
    }

    // Calculate portfolio composition over time
    const portfolioHistory = calculatePortfolioHistory(txns);
    console.log("[Portfolio History] Timeline entries:", portfolioHistory.length);

    // Get current holdings to determine which symbols we need price data for
    const currentHoldings = getCurrentHoldings(txns);
    const symbols = Array.from(currentHoldings.keys());
    console.log("[Portfolio History] Current symbols:", symbols);

    if (symbols.length === 0) {
      console.log("[Portfolio History] No current holdings, returning empty data");
      return NextResponse.json({
        portfolioHistory: [],
        benchmark: [],
        totalValue: 0,
        totalCost: 0,
        totalPnl: 0,
        totalPnlPct: 0,
      });
    }

    // Fetch historical data
    const { fromDate, toDate } = getPeriodDates(period);
    console.log(`[Portfolio History] Date range: ${fromDate} to ${toDate}`);
    
    const historicalData = await getHistoricalData(symbols, fromDate, toDate);

    // Calculate portfolio value over time
    const portfolioValues = calculatePortfolioValues(
      portfolioHistory,
      historicalData,
      fromDate,
      toDate,
    );

    console.log(`[Portfolio History] Calculated ${portfolioValues.length} portfolio value points`);

    // Get benchmark data (S&P 500 equivalent)
    const benchmarkData = await getBenchmarkData(fromDate, toDate);
    console.log(`[Portfolio History] Benchmark data points: ${benchmarkData.length}`);

    // Calculate current totals
  const currentPrices = await getCurrentPrices(symbols);
    console.log(`[History] Current prices fetched:`, Object.fromEntries(currentPrices));

    const { totalValue, totalCost, totalPnl, totalPnlPct } =
      calculateCurrentTotals(currentHoldings, currentPrices);

    const result = {
      portfolioHistory: portfolioValues,
      benchmark: benchmarkData,
      totalValue,
      totalCost,
      totalPnl,
      totalPnlPct,
      period,
    };

    console.log(`[Portfolio History] Returning result with ${portfolioValues.length} history points and current total: $${totalValue}`);
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error fetching portfolio history:", msg);
    console.error("[/api/portfolio/history] GET failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio history", detail: msg },
      { status: 500 },
    );
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
    toDate: now.format("YYYY-MM-DD"),
  };
}

async function getCurrentPrices(symbols: string[]) {
  const provider = buildProvider();
  // The cacheKey is not used here, but we keep the signature for consistency.
  // The ttl is managed within getQuotesCached.
  const quotes = await getQuotesCached(provider, symbols);
  const prices = new Map<string, number>();
  for (const symbol of symbols) {
    const price = quotes[symbol];
    if (price) {
      prices.set(symbol, price);
    } else {
      // Fallback to getLatestClose if quote is not available
      const close = await getLatestClose(provider, symbol);
      if (close) {
        prices.set(symbol, close);
        console.log(`[History] Using fallback price for ${symbol}: ${close}`);
      } else {
        console.log(`[History] No price found for ${symbol}`);
      }
    }
  }
  return prices;
}

interface Transaction {
  type: string; // BUY | SELL | CASH | others
  symbol?: string;
  security?: { symbol?: string };
  qty?: number | string;
  price?: number | string;
  tradeDate: string | Date;
}

function getCurrentHoldings(txns: Transaction[]) {
  const holdings = new Map<
    string,
    { symbol: string; qty: number; cost: number; avgPrice: number }
  >();

  for (const t of txns) {
    if (t.type === "CASH") continue;

    // Fix: Use t.symbol directly instead of t.security?.symbol
    const sym = t.symbol || t.security?.symbol;
    if (!sym) continue;

    const qty = t.qty != null ? Number(t.qty) : 0;
    const px = t.price != null ? Number(t.price) : 0;

    if (t.type === "BUY") {
      const h = holdings.get(sym) || {
        symbol: sym,
        qty: 0,
        cost: 0,
        avgPrice: 0,
      };
      const newQty = h.qty + qty;
      const newCost = h.cost + qty * px;
      h.qty = newQty;
      h.cost = newCost;
      h.avgPrice = newQty > 0 ? newCost / newQty : 0;
      holdings.set(sym, h);
    } else if (t.type === "SELL") {
      const h = holdings.get(sym);
      if (h) {
        h.qty -= qty;
        // Note: Cost basis is not reduced on sell for performance calculations
        holdings.set(sym, h);
      }
    }
  }
  return holdings;
}

function calculatePortfolioHistory(
  txns: Transaction[],
): { date: string; holdings: Map<string, number> }[] {
  const history: { date: string; holdings: Map<string, number> }[] = [];
  if (txns.length === 0) return history;

  const currentHoldings = new Map<string, number>();
  let currentDate = dayjs(txns[0].tradeDate).format("YYYY-MM-DD");

  for (const t of txns) {
    const tradeDate = dayjs(t.tradeDate).format("YYYY-MM-DD");

    if (tradeDate !== currentDate) {
      history.push({ date: currentDate, holdings: new Map(currentHoldings) });
      currentDate = tradeDate;
    }

    if (t.type === "CASH") continue;
    const sym = t.symbol || t.security?.symbol;
    if (!sym) continue;

    const qty = Number(t.qty) || 0;
    const currentQty = currentHoldings.get(sym) || 0;

    if (t.type === "BUY") {
      currentHoldings.set(sym, currentQty + qty);
    } else if (t.type === "SELL") {
      currentHoldings.set(sym, currentQty - qty);
    }
  }

  history.push({ date: currentDate, holdings: new Map(currentHoldings) });
  return history;
}

async function getHistoricalData(
  symbols: string[],
  fromDate: string,
  toDate: string,
) {
  console.log(`[getHistoricalData] Fetching data for ${symbols.length} symbols from ${fromDate} to ${toDate}`);
  const provider = buildProvider();
  const data = new Map<string, { date: string; close: number }[]>();

  for (const symbol of symbols) {
    try {
      console.log(`[getHistoricalData] Fetching candles for ${symbol}...`);
      const candles = await getCandlesMapCached(provider, symbol);
      
      if (candles && candles.size > 0) {
        const candleData = Array.from(candles.entries())
          .filter(([date]) => date >= fromDate && date <= toDate)
          .map(([date, close]) => ({ date, close }))
          .sort((a, b) => a.date.localeCompare(b.date)); // Ensure chronological order

        console.log(`[getHistoricalData] Found ${candleData.length} price points for ${symbol} in date range`);
        data.set(symbol, candleData);
        
        // Log a few sample prices for debugging
        if (candleData.length > 0) {
          console.log(`[getHistoricalData] ${symbol} sample prices: ${candleData.slice(0, 3).map(c => `${c.date}:$${c.close}`).join(', ')}`);
        }
      } else {
        console.warn(`[getHistoricalData] No historical data found for ${symbol}`);
        data.set(symbol, []); // Set empty array to prevent undefined issues
      }
    } catch (error) {
      console.error(`[getHistoricalData] Failed to get historical data for ${symbol}:`, error);
      data.set(symbol, []); // Set empty array for failed symbols
    }
  }

  const totalDataPoints = Array.from(data.values()).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`[getHistoricalData] Total data points collected: ${totalDataPoints}`);
  
  return data;
}

function calculatePortfolioValues(
  portfolioHistory: { date: string; holdings: Map<string, number> }[],
  historicalData: Map<string, { date: string; close: number }[]>,
  fromDateStr: string,
  toDateStr: string,
) {
  console.log("[calculatePortfolioValues] Input - Portfolio history entries:", portfolioHistory.length);
  console.log("[calculatePortfolioValues] Input - Historical data symbols:", Array.from(historicalData.keys()));
  
  if (portfolioHistory.length === 0) {
    console.log("[calculatePortfolioValues] No portfolio history, returning empty array");
    return [];
  }

  // Build price lookup maps
  const priceMap = new Map<string, Map<string, number>>();
  for (const [symbol, prices] of historicalData.entries()) {
    const symbolPriceMap = new Map<string, number>();
    for (const price of prices) {
      symbolPriceMap.set(price.date, price.close);
    }
    priceMap.set(symbol, symbolPriceMap);
    console.log(`[calculatePortfolioValues] Loaded ${prices.length} price points for ${symbol}`);
  }

  const portfolioValues: { date: string; value: number }[] = [];
  
  // Use requested period bounds
  const firstDate = dayjs(fromDateStr);
  const lastDate = dayjs(toDateStr);
  console.log(`[calculatePortfolioValues] Using period: ${firstDate.format("YYYY-MM-DD")} to ${lastDate.format("YYYY-MM-DD")}`);

  let currentHoldings = new Map<string, number>();
  let historyIndex = 0;

  // Generate portfolio values for each day in the range
  for (
    let d = firstDate;
    d.isSameOrBefore(lastDate, "day");
    d = d.add(1, "day")
  ) {
    const dateStr = d.format("YYYY-MM-DD");

    // Update holdings if we have a transaction on this day
    // Advance holdings to include all transactions up to and including this day
    while (
      historyIndex < portfolioHistory.length &&
      dayjs(portfolioHistory[historyIndex].date).isSameOrBefore(d, "day")
    ) {
      currentHoldings = new Map(portfolioHistory[historyIndex].holdings);
      historyIndex++;
    }

    let dailyValue = 0;
    let foundPrices = 0;
    
    for (const [symbol, qty] of currentHoldings.entries()) {
      if (qty <= 0) continue; // Skip if no holdings
      
      const symbolPrices = priceMap.get(symbol);
      let price = symbolPrices?.get(dateStr);
      
      // Forward-fill: if no price for this day, use the most recent past price within the period
      if (!price && symbolPrices) {
        let prev = d.subtract(1, "day");
        const start = firstDate.subtract(1, "day");
        while (!price && prev.isAfter(start)) {
          price = symbolPrices.get(prev.format("YYYY-MM-DD"));
          prev = prev.subtract(1, "day");
        }
      }
      
      if (price && price > 0) {
        dailyValue += qty * price;
        foundPrices++;
      } else {
        console.log(`[calculatePortfolioValues] No price found for ${symbol} on ${dateStr}, qty: ${qty}`);
      }
    }
    
    portfolioValues.push({ date: dateStr, value: Number(dailyValue.toFixed(2)) });
    
    if (portfolioValues.length <= 5) { // Log first few for debugging
      console.log(`[calculatePortfolioValues] ${dateStr}: ${currentHoldings.size} symbols, ${foundPrices} with prices, value: $${dailyValue.toFixed(2)}`);
    }
  }

  console.log(`[calculatePortfolioValues] Generated ${portfolioValues.length} value points`);
  return portfolioValues;
}

async function getBenchmarkData(fromDate: string, toDate: string) {
  const provider = buildProvider();
  try {
    const candlesMap = await getCandlesMapCached(provider, "SPY");
    if (!candlesMap || candlesMap.size === 0) return [];

    const candles = Array.from(candlesMap.entries())
      .filter(([date]) => date >= fromDate && date <= toDate)
      .map(([date, close]) => ({ t: date, c: close }));

    if (candles.length === 0) return [];

    const firstValue = candles[0].c;
    return candles.map(c => ({
      date: dayjs(c.t).format("YYYY-MM-DD"),
      value: (c.c / firstValue) * 100,
    }));
  } catch (error) {
    console.error("Failed to get benchmark data:", error);
    return [];
  }
}

function calculateCurrentTotals(
  holdings: Map<
    string,
    { symbol: string; qty: number; cost: number; avgPrice: number }
  >,
  prices: Map<string, number>,
) {
  let totalValue = 0;
  let totalCost = 0;

  for (const [symbol, holding] of holdings.entries()) {
    const price = prices.get(symbol) || 0;
    totalValue += holding.qty * price;
    totalCost += holding.cost;
  }

  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return { totalValue, totalCost, totalPnl, totalPnlPct };
}
