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
    // Get all transactions for the account
    const db = await getMongoDb();
    const txns = await db
      .collection("transactions")
      .find(accountId ? { accountId } : {}, { sort: { tradeDate: 1 } })
      .toArray();

    console.log("[Portfolio History] Found transactions:", txns.length);

    // Calculate portfolio composition over time
    const portfolioHistory = calculatePortfolioHistory(txns);

    console.log("[Portfolio History] Timeline entries:", portfolioHistory.length);

    // Get historical prices for current holdings
    const currentHoldings = getCurrentHoldings(txns);
    const symbols = Array.from(currentHoldings.keys());

    console.log("[Portfolio History] Current symbols:", symbols);

    if (symbols.length === 0) {
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
    const historicalData = await getHistoricalData(symbols, fromDate, toDate);

    // Calculate portfolio value over time
    const portfolioValues = calculatePortfolioValues(
      portfolioHistory,
      historicalData,
    );

    // Get benchmark data (S&P 500 equivalent)
    const benchmarkData = await getBenchmarkData(fromDate, toDate);

    // Calculate current totals
    const currentPrices = await getCurrentPrices(
      symbols,
      `portfolio-history-current-prices-${accountId}`,
    );
    console.log(`[History] Current prices fetched:`, currentPrices);

    const { totalValue, totalCost, totalPnl, totalPnlPct } =
      calculateCurrentTotals(currentHoldings, currentPrices);

    return NextResponse.json({
      portfolioHistory: portfolioValues,
      benchmark: benchmarkData,
      totalValue,
      totalCost,
      totalPnl,
      totalPnlPct,
      period,
    });
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

async function getCurrentPrices(symbols: string[], _cacheKey: string) {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCurrentHoldings(txns: any[]) {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  txns: any[],
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
  const provider = buildProvider();
  const data = new Map<string, { date: string; close: number }[]>();

  for (const symbol of symbols) {
    try {
      const candles = await getCandlesMapCached(provider, symbol);
      if (candles) {
        const candleData = Array.from(candles.entries())
          .filter(([date]) => date >= fromDate && date <= toDate)
          .map(([date, close]) => ({ date, close }));

        data.set(symbol, candleData);
      }
    } catch (error) {
      console.error(`Failed to get historical data for ${symbol}:`, error);
    }
  }
  return data;
}

function calculatePortfolioValues(
  portfolioHistory: { date: string; holdings: Map<string, number> }[],
  historicalData: Map<string, { date: string; close: number }[]>,
) {
  if (portfolioHistory.length === 0) return [];

  const priceMap = new Map<string, Map<string, number>>();
  for (const [symbol, prices] of historicalData.entries()) {
    const symbolPriceMap = new Map<string, number>();
    for (const price of prices) {
      symbolPriceMap.set(price.date, price.close);
    }
    priceMap.set(symbol, symbolPriceMap);
  }

  const portfolioValues: { date: string; value: number }[] = [];
  const firstDate = dayjs(portfolioHistory[0].date);
  const lastDate = dayjs();

  let currentHoldings = new Map<string, number>();
  let historyIndex = 0;

  for (
    let d = firstDate;
    d.isSameOrBefore(lastDate, "day");
    d = d.add(1, "day")
  ) {
    const dateStr = d.format("YYYY-MM-DD");

    while (
      historyIndex < portfolioHistory.length &&
      dayjs(portfolioHistory[historyIndex].date).isSameOrBefore(d, "day")
    ) {
      currentHoldings = portfolioHistory[historyIndex].holdings;
      historyIndex++;
    }

    let dailyValue = 0;
    for (const [symbol, qty] of currentHoldings.entries()) {
      const symbolPrices = priceMap.get(symbol);
      let price = symbolPrices?.get(dateStr);
      if (!price) {
        // If price is not found for the current day (e.g., weekend/holiday), find the last known price
        let prevDay = d.subtract(1, "day");
        while (!price && prevDay.isAfter(firstDate.subtract(1, "day"))) {
          price = symbolPrices?.get(prevDay.format("YYYY-MM-DD"));
          prevDay = prevDay.subtract(1, "day");
        }
      }
      dailyValue += qty * (price || 0);
    }
    portfolioValues.push({ date: dateStr, value: dailyValue });
  }

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
