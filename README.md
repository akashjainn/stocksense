This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Dev Setup (StockSense)

1. Install: npm install
2. Configure `.env`:
	- For local SQLite dev: `DATABASE_URL=file:./prisma/dev.db`
	- For Turso (hosted): set `DATABASE_URL=libsql://<host>?authToken=...` or split `DATABASE_URL=libsql://<host>` and `TURSO_AUTH_TOKEN=...`
	- For MongoDB (Atlas): set `MONGODB_URI=your_connection_string` and optional `MONGODB_DB=stocksense`
	- Also set: `NEXTAUTH_SECRET`, `ALPHAVANTAGE_API_KEY`, `REDIS_URL`, `EDGAR_USER_AGENT`
3. DB (SQLite): `npm run prisma:migrate`; `npm run db:seed`
   DB (Turso): `npm run db:turso:apply`
4. Run: npm run dev (http://localhost:3000)

MongoDB quick check:
- GET /api/mongo-test — verifies connection (requires MONGODB_URI)

APIs available:
- GET /api/health
- GET /api/quotes?symbols=AAPL,MSFT
- POST/GET /api/transactions

## Market Data (Live + Quotes)

This project uses Alpaca for live market data streaming and Alpha Vantage for on-demand price/quote lookups.

- Live streaming: implemented via Server-Sent Events (SSE) at `GET /api/stream`. Under the hood, it uses the Alpaca provider selected by `MARKET_DATA_PROVIDER=alpaca`.
- Quotes and historical candles for portfolio calculations use the `AlphaVantageProvider` by default (`src/lib/providers/prices.ts`).

Environment setup (.env):
- For Turso:
	- DATABASE_URL=libsql://<your-db>.turso.io
	- TURSO_AUTH_TOKEN=<your-token>
- For local dev:
	- DATABASE_URL=file:./prisma/dev.db
- MARKET_DATA_PROVIDER=alpaca
- ALPACA_API_KEY_ID=your_key
- ALPACA_API_SECRET_KEY=your_secret
- ALPHAVANTAGE_API_KEY=your_alpha_vantage_key

Optional: You can switch providers in code later, but Polygon is not used in this repo. The previous Polygon implementation has been removed.

Endpoints:
- GET `/api/stream?symbols=AAPL,MSFT` — Emits `event: quote` lines containing JSON ticks (SSE)
- GET `/api/quotes?symbols=AAPL,MSFT` — On-demand quotes via the price provider
- GET `/api/portfolio`, `/api/portfolio/history` — Portfolio value calculations (uses stored prices + provider fallbacks)

Notes:
- Market data may be subject to licensing and display rules. Ensure your usage complies with your data vendor terms.
- Alpaca paper keys work for development. For production, ensure proper entitlements and rate limits are respected.

Quick test:
- curl -N "http://localhost:3000/api/stream?symbols=AAPL,MSFT" and observe streaming `event: quote` messages.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
