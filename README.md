This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Dev Setup (StockSense)

1. Install: npm install
2. Configure `.env`:
	- For local SQLite dev: `DATABASE_URL=file:./prisma/dev.db`
	- For Turso (hosted): set `DATABASE_URL=libsql://<host>?authToken=...` or split `DATABASE_URL=libsql://<host>` and `TURSO_AUTH_TOKEN=...`
	- For MongoDB (Atlas): set `MONGODB_URI=your_connection_string` and optional `MONGODB_DB=stocksense`
	- Also set: `NEXTAUTH_SECRET`, `ALPHAVANTAGE_API_KEY`, `REDIS_URL`, `EDGAR_USER_AGENT`
3. DB (SQLite): `npm run prisma:migrate`; `npm run db:seed`
# StockSense

Portfolio analytics using real market data. Built with Next.js App Router and MongoDB; quotes via Alpha Vantage and live streaming via Alpaca. Deployable on Vercel.

## Tech stack
- Next.js 15 (App Router), TypeScript
- MongoDB (Atlas or self‑hosted) for transactions and accounts
- Tailwind CSS + PostCSS
- Recharts for charts, Lucide Icons
- NextAuth (email/credentials ready; demo flow creates a local user)
- Alpha Vantage (quotes, daily candles), Alpaca (SSE live stream)
- Simple in‑memory server cache for quotes/candles to absorb rate limits

Note on Prisma: Prisma is present for historical/local tooling, but runtime portfolio data uses MongoDB. Prisma is not required to run the app with MongoDB.

## Features
- Upload transactions (CSV) and compute holdings, P/L, and allocations
- Real‑time quotes/streaming (SSE) and cached quote/candle lookups
- Portfolio valuation:
	- totalValue = market value of equity (excludes cash)
	- totalValueWithCash = equity + cash (reported separately)
- Historical performance chart with forward‑filled daily closes
- Clear portfolio (delete all transactions for selected account)

## Quick start
1) Install dependencies
- `npm install`

2) Configure environment variables (`.env.local`)
- MongoDB
	- `MONGODB_URI=mongodb+srv://...`
	- `MONGODB_DB=stocksense` (optional; defaults in code)
- Market data
	- `ALPHAVANTAGE_API_KEY=your_alpha_vantage_key`
	- `MARKET_DATA_PROVIDER=alpaca` (for live stream)
	- `ALPACA_API_KEY_ID=...`
	- `ALPACA_API_SECRET_KEY=...`
- Auth & misc
	- `NEXTAUTH_SECRET=your_generated_secret`
	- `REDIS_URL=` (optional, if you wire Redis)
	- `EDGAR_USER_AGENT=` (optional, only if you use SEC/EDGAR fetches)

3) Run the app
- `npm run dev` → http://localhost:3000

4) Sanity checks
- GET `http://localhost:3000/api/health`
- GET `http://localhost:3000/api/mongo-test` (requires MONGODB_URI)

## Data providers & caching
- Alpha Vantage (primary): latest quote and daily candles
- Alpaca (optional): live ticks via SSE
- Caching: quotes TTL ~60s, candles TTL ~12h (in‑memory)
- Fallbacks: if a live quote is missing, we use the latest known daily close

## APIs
- Portfolio
	- GET `/api/portfolio?accountId=...` — current equity totals and positions (equity‑only totalValue)
	- GET `/api/portfolio/history?accountId=...&period=1M|3M|6M|1Y|ALL` — daily series with forward‑fill and benchmark
- Transactions
	- POST `/api/transactions` — create a transaction (BUY/SELL/DIV/CASH)
	- GET `/api/transactions` — list transactions
	- DELETE `/api/transactions?accountId=...` — clear all transactions for an account
- Import
	- POST `/api/import/transactions` — upload a CSV of transactions
- Quotes/stream
	- GET `/api/quotes?symbols=AAPL,MSFT` — on‑demand quotes
	- GET `/api/stream?symbols=AAPL,MSFT` — live stream (SSE)
- Accounts
	- GET `/api/accounts` — list/create demo accounts; POST to create

## How valuation works
- Equity totals are calculated from current holdings × price per symbol.
- Cash is tracked from CASH transactions and reported separately.
- totalValue = sum(qty × price) across positions (excludes cash)
- totalValueWithCash = totalValue + cash (returned by API when needed)

### Historical chart
1) Build a daily date range for the selected period
2) Build cumulative positions per day from transactions
3) Fetch daily closes per symbol and forward‑fill missing days within period
4) Sum shares × price per day → `{ date: 'YYYY‑MM‑DD', value: number }[]`

## Troubleshooting
- Chart shows zero or empty
	- Check `/api/portfolio/history` response in DevTools → Network
	- Ensure ALPHAVANTAGE_API_KEY is set; watch server logs for rate‑limit messages
	- Forward‑fill is applied; persistent zeros usually indicate missing symbols or API limits
- “Right value shows then disappears”
	- The server cache reduces flakiness from rate limits; we fall back to latest close if a quote is missing
- Want net‑worth on the dashboard?
	- Use `totalValueWithCash` instead of `totalValue`

## Deploy
- Optimized for Vercel (Next.js App Router)
- Configure the same `.env` variables in your Vercel project

---
Maintained by the StockSense team.
