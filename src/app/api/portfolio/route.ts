import { prisma } from "@/lib/db";

export async function GET() {
  const txns = await prisma.transaction.findMany({ orderBy: { tradeDate: "asc" }, include: { account: true, security: true } });
  // Very basic cash and holdings summary placeholder
  const holdings = new Map<string, { symbol: string; qty: number; cost: number }>();
  let cash = 0;
  for (const t of txns) {
    if (t.type === "CASH") {
      cash += Number(t.price ?? 0);
    } else if ((t.type === "BUY" || t.type === "SELL") && t.security?.symbol && t.qty && t.price) {
      const key = t.security.symbol;
      const h = holdings.get(key) || { symbol: key, qty: 0, cost: 0 };
      const qty = Number(t.qty);
      const px = Number(t.price);
      if (t.type === "BUY") {
        h.qty += qty;
        h.cost += qty * px;
        cash -= qty * px;
      } else {
        h.qty -= qty;
        cash += qty * px;
      }
      holdings.set(key, h);
    }
  }
  const positions = Array.from(holdings.values()).filter((p) => p.qty > 0);
  const totalCost = positions.reduce((s, p) => s + p.cost, 0);
  // Market value TBD (needs quotes); return cost as placeholder
  const totalValue = totalCost + cash;
  return Response.json({ cash, totalCost, totalValue, positions });
}
