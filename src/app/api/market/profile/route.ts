import { NextRequest, NextResponse } from "next/server";

// Enhanced profile endpoint with multi-provider fallback (FMP -> Alpha Vantage -> minimal)

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
  dividendYield?: number; // percent value (not ratio)
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

  const FMP_KEY = process.env.FMP_KEY;
  const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || process.env.ALPHA_KEY || process.env.ALPHA; // allow multiple naming conventions

  // 1. Try Financial Modeling Prep
  if (FMP_KEY) {
    try {
      const fmpUrl = `https://financialmodelingprep.com/api/v3/profile/${encodeURIComponent(symbol)}?apikey=${FMP_KEY}`;
      const res = await fetch(fmpUrl, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const p = json?.[0];
        if (p) {
          const rangeParts = typeof p.range === 'string' ? p.range.split('-').map((s: string) => s.trim()) : [];
          const out: Profile = {
            symbol,
            name: p.companyName,
            exchange: p.exchangeShortName,
            currency: p.currency,
            sector: p.sector,
            industry: p.industry,
            marketCap: safeNumber(p.mktCap),
            pe: safeNumber(p.pe),
            eps: safeNumber(p.eps),
            dividendYield: safeNumber(p.lastDiv), // FMP lastDiv is absolute dividend; keep raw for now
            fiftyTwoWeekLow: safeNumber(rangeParts?.[0]),
            fiftyTwoWeekHigh: safeNumber(rangeParts?.[1]),
            description: p.description,
            website: p.website,
          };
          return NextResponse.json(out);
        }
      }
    } catch (e) {
      console.warn('[Profile] FMP fetch failed, continuing to fallback', e);
    }
  }

  // 2. Try Alpha Vantage OVERVIEW as fallback
  if (ALPHA_VANTAGE_KEY) {
    try {
      const avUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${ALPHA_VANTAGE_KEY}`;
      const res = await fetch(avUrl, { cache: "no-store" });
      if (res.ok) {
        const o: Record<string, unknown> = await res.json();
        // If AV returns an empty object or Note (rate limit), fallback further
        if (o && Object.keys(o).length > 0 && !(typeof o.Note === 'string')) {
          const divYieldRaw = safeNumber(o.DividendYield); // AV provides ratio (e.g. 0.0123)
          const out: Profile = {
            symbol,
            name: (o.Name as string) || symbol,
            exchange: (o.Exchange as string) || undefined,
            currency: (o.Currency as string) || 'USD',
            sector: (o.Sector as string) || undefined,
            industry: (o.Industry as string) || undefined,
            marketCap: safeNumber(o.MarketCapitalization),
            pe: safeNumber(o.PERatio),
            eps: safeNumber(o.EPS),
            dividendYield: divYieldRaw != null ? Number(divYieldRaw) * 100 : undefined, // convert ratio to percent
            fiftyTwoWeekHigh: safeNumber(o['52WeekHigh']),
            fiftyTwoWeekLow: safeNumber(o['52WeekLow']),
            description: (o.Description as string) || undefined,
            website: (o.Website as string) || undefined,
          };
          return NextResponse.json(out);
        }
      }
    } catch (e) {
      console.warn('[Profile] Alpha Vantage fetch failed, continuing to minimal fallback', e);
    }
  }

  // 3. Minimal fallback so UI still shows something
  const minimal: Profile = {
    symbol,
    name: `${symbol} Inc.`,
    exchange: 'NASDAQ',
    currency: 'USD',
  };
  return NextResponse.json(minimal);
}