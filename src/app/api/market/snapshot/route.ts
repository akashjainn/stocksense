import { fetchYahooQuoteSummary } from "@/lib/yahoo";
import { cached } from '@/lib/cache';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Item = { name: string; symbol: string; value: number | null; changePct: number | null };

const INDEXES: Array<{ name: string; symbol: string; yahoo: string }> = [
  { name: "S&P 500", symbol: "SPX", yahoo: "^GSPC" },
  { name: "NASDAQ", symbol: "IXIC", yahoo: "^IXIC" },
  { name: "DOW", symbol: "DJI", yahoo: "^DJI" },
  { name: "VIX", symbol: "VIX", yahoo: "^VIX" },
];

export async function GET() {
  try {
    const { value: data } = await cached<Item[]>({
      key: 'snapshot:indexes',
      ttlMs: 60_000, // 1m fresh
      staleMs: 10 * 60_000, // 10m stale acceptable
      fetcher: async () => {
        const modules: { price: ["regularMarketPrice", "regularMarketChangePercent"] } = { price: ["regularMarketPrice", "regularMarketChangePercent"] };
        const results = await Promise.all(
          INDEXES.map(async (idx): Promise<Item> => {
            try {
              const { headers, values } = await fetchYahooQuoteSummary(idx.yahoo, modules);
              const obj: Record<string, unknown> = {};
              headers.forEach((h, i) => (obj[h] = values[i]));
              const value = typeof obj.regularMarketPrice === "number" ? (obj.regularMarketPrice as number) : Number(obj.regularMarketPrice);
              const changePct = typeof obj.regularMarketChangePercent === "number" ? (obj.regularMarketChangePercent as number) : Number(obj.regularMarketChangePercent);
              return { name: idx.name, symbol: idx.symbol, value: Number.isFinite(value) ? value : null, changePct: Number.isFinite(changePct) ? changePct : null };
            } catch {
              return { name: idx.name, symbol: idx.symbol, value: null, changePct: null };
            }
          })
        );
        return results;
      }
    });
    return Response.json({ ok: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
