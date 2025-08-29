import Decimal from "decimal.js";

type Lot = { qty: Decimal; price: Decimal };

export function fifoCostBasis(txns: { type: "BUY" | "SELL"; qty: number; price: number }[]) {
  const lots: Lot[] = [];
  for (const t of txns) {
    if (t.type === "BUY") lots.push({ qty: new Decimal(t.qty), price: new Decimal(t.price) });
    else {
      let remaining = new Decimal(t.qty);
      while (remaining.gt(0) && lots.length) {
        const lot = lots[0];
        const take = Decimal.min(remaining, lot.qty);
        lot.qty = lot.qty.minus(take);
        remaining = remaining.minus(take);
        if (lot.qty.lte(0)) lots.shift();
      }
    }
  }
  const totalQty = lots.reduce((s, l) => s.plus(l.qty), new Decimal(0));
  const totalCost = lots.reduce((s, l) => s.plus(l.qty.mul(l.price)), new Decimal(0));
  return {
    qty: totalQty.toNumber(),
    cost: totalCost.toNumber(),
    avg: totalQty.eq(0) ? 0 : totalCost.div(totalQty).toNumber(),
  };
}
