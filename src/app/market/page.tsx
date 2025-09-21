"use client";
import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";

const DEFAULT_INDEXES = [
  { label: "S&P 500", symbol: "^GSPC" },
  { label: "NASDAQ", symbol: "^IXIC" },
  { label: "DOW", symbol: "^DJI" },
];

const DEFAULT_TICKERS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "TSLA", "META", "AMD", "NFLX", "SPY"];

function formatNumber(n: number) {
  return n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n.toFixed(2);
}

function classNames(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

const IndexCard: React.FC<{ label: string; symbol: string }> = ({ label, symbol }) => {
  const [quote, setQuote] = React.useState<{ price: number | null; percent: number | null } | null>(null);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
        const j = await r.json();
        if (!mounted) return;
        setQuote(j.quote || null);
      } catch {/* ignore */}
    })();
    return () => { mounted = false; };
  }, [symbol]);
  const pct = quote?.percent != null ? (quote.percent).toFixed(2) + "%" : "—";
  const up = (quote?.percent ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900">
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">{label}</p>
      <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{quote?.price != null ? formatNumber(quote.price) : "—"}</p>
      <p className={classNames("text-sm font-medium", up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>{pct}</p>
    </div>
  );
};

interface QuoteData { price: number | null; percent: number | null; open: number | null; high: number | null; low: number | null; }
const QuoteRow: React.FC<{ symbol: string; onClick?: () => void }> = ({ symbol, onClick }) => {
  const [quote, setQuote] = React.useState<QuoteData | null>(null);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`/api/market/quote?symbol=${symbol}`);
        const j = await r.json();
        if (!mounted) return;
        setQuote(j.quote);
      } catch {/* ignore */}
    })();
    return () => { mounted = false; };
  }, [symbol]);
  const pct = quote?.percent != null ? quote.percent.toFixed(2) + "%" : "—";
  const up = (quote?.percent ?? 0) >= 0;
  return (
    <div onClick={onClick} className="grid grid-cols-6 gap-2 px-3 py-2 text-sm">
      <div className="col-span-2 font-medium">{symbol}</div>
      <div>{quote?.price != null ? formatNumber(quote.price) : "—"}</div>
      <div>{quote?.open != null ? formatNumber(quote.open) : "—"}</div>
      <div>{quote?.high != null ? formatNumber(quote.high) : "—"}</div>
      <div className={up ? "text-emerald-600" : "text-red-600"}>{pct}</div>
    </div>
  );
};

export default function MarketPage() {
  const [activeSymbol, setActiveSymbol] = React.useState("AAPL");
  const [hist, setHist] = React.useState<Array<{ date: string; close: number }>>([]);
  const [range, setRange] = React.useState("6M");
  const [query, setQuery] = React.useState("");
  const [search, setSearch] = React.useState<string | null>(null);
  const [loadingHist, setLoadingHist] = React.useState(false);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setActiveSymbol(query.trim().toUpperCase());
    setSearch(query.trim().toUpperCase());
  }

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingHist(true);
      try {
        const r = await fetch(`/api/market/history?symbol=${encodeURIComponent(activeSymbol)}&range=${range}`);
        const j = await r.json();
        if (!mounted) return;
        const series = j.series || [];
  setHist(series.map((row: { date: string; close: number }) => ({ date: row.date, close: row.close })));
      } catch {/* ignore */}
      finally { if (mounted) setLoadingHist(false); }
    }
    load();
    return () => { mounted = false; };
  }, [activeSymbol, range]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Market View</h1>
        <Link href="/research" className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">Back to Research</Link>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Major Indices</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEFAULT_INDEXES.map(ix => <IndexCard key={ix.symbol} label={ix.label} symbol={ix.symbol} />)}
        </div>
      </section>

      <section className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <form onSubmit={onSearch} className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ticker (e.g., AAPL, NVDA, SPY)"
              className="border rounded-xl px-3 py-2 w-72 bg-white dark:bg-neutral-900 dark:border-neutral-700"
            />
            <button className="rounded-xl px-4 py-2 bg-neutral-900 text-white dark:bg-emerald-600">Search</button>
          </form>
          <div className="flex gap-2">
            {["1M","3M","6M","1Y","5Y","MAX"].map(r => (
              <button key={r} onClick={() => setRange(r)} className={classNames("px-3 py-1 rounded-full border text-sm",
                r===range ? "bg-neutral-900 text-white dark:bg-emerald-600 dark:border-emerald-500" : "bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700")}>{r}</button>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-2xl border p-4 bg-white dark:bg-neutral-900">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-neutral-600 dark:text-neutral-400">{(search || activeSymbol)} • {range}</div>
            {loadingHist && <div className="text-xs text-neutral-500">Loading…</div>}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hist} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" minTickGap={32} />
                <YAxis domain={["auto","auto"]} tickFormatter={(v)=>String(v)} />
                <Tooltip formatter={(v: number)=>formatNumber(v)} labelFormatter={(l)=>String(l)} />
                <Line type="monotone" dataKey="close" strokeWidth={2} dot={false} stroke="#10b981" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-2">Popular</h2>
        <div className="rounded-2xl border overflow-hidden">
          <div className="grid grid-cols-6 gap-2 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            <div className="col-span-2">Symbol</div>
            <div>Price</div>
            <div>Open</div>
            <div>High</div>
            <div>Change</div>
          </div>
          {DEFAULT_TICKERS.map(t => (
            <div key={t} onClick={()=>{setActiveSymbol(t); setSearch(null);}} className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 border-t last:border-b border-neutral-100 dark:border-neutral-800">
              <QuoteRow symbol={t} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
