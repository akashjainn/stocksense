This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Dev Setup (StockSense)

1. Install: npm install
2. Configure `.env`:
	- DATABASE_URL=file:./dev.db (SQLite for dev)
	- NEXTAUTH_SECRET, ALPHAVANTAGE_API_KEY, REDIS_URL, EDGAR_USER_AGENT
3. DB: npm run prisma:migrate; npm run db:seed
4. Run: npm run dev (http://localhost:3000)

APIs available:
- GET /api/health
- GET /api/quotes?symbols=AAPL,MSFT
- POST/GET /api/transactions

## Real Market Data

This repo can stream real-time quotes from Polygon via WebSockets and forward them to the browser with Server-Sent Events (SSE).

Setup:
- Install: npm i ws
- .env:
	- MARKET_DATA_PROVIDER=polygon
	- POLYGON_API_KEY=YOUR_POLYGON_API_KEY

Endpoints:
- GET /api/stream?symbols=AAPL,MSFT — Emits `event: quote` lines containing JSON ticks.

Notes:
- Market data may be subject to licensing and display rules. Ensure your usage complies with your data vendor terms.
- For delayed data, Polygon offers delayed endpoints; adapt provider as needed.

Quick test:
- curl -N "http://localhost:3000/api/stream?symbols=AAPL,MSFT" and observe streaming events.

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
