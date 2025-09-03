export type LotEventType =
  | "BUY"
  | "SELL"
  | "DIVIDEND"
  | "SPLIT"
  | "ASSIGNED_AWAY"
  | "ASSIGNMENT_IN"
  | "ADJUSTMENT";

type Num = number | string | null | undefined;

export interface LotEventInput {
  type: LotEventType;
  quantity?: number; // positive for inflow, negative for outflow (SELL uses positive here)
  amount?: Num; // for SPLIT ratio or cash amounts; SPLIT expects ratio like 2.0 for 2-for-1
}

export interface PremiumAllocInput {
  premium: Num; // signed: + received, - paid
  fees?: Num;
}

export interface SnapshotInput {
  initialQty: number;
  pricePerShare: Num;
  feesAtOpen?: Num;
  events: LotEventInput[];
  premiumAllocs: PremiumAllocInput[];
}

export interface LotSnapshot {
  currentQty: number;
  grossCost: number;
  netPremium: number;
  effectiveBasis: number;
  effectivePricePerShare: number;
}

const toN = (x: Num): number => (x == null ? 0 : Number(x));

export function snapshotLot(input: SnapshotInput): LotSnapshot {
  let qty = input.initialQty;
  const grossCost = input.initialQty * toN(input.pricePerShare) + toN(input.feesAtOpen);

  for (const ev of input.events) {
    if (ev.type === "SPLIT") {
      const ratio = toN(ev.amount) || 1;
      if (ratio > 0 && ratio !== 1) {
        // Adjust quantity; total gross cost remains the same; PPS scales inversely
        qty = Math.round(qty * ratio);
  // grossCost unchanged by design; effective PPS becomes grossCost/qty
      }
    } else if (ev.type === "SELL" || ev.type === "ASSIGNED_AWAY") {
      const out = ev.quantity ? Math.max(0, ev.quantity) : 0;
      qty = Math.max(0, qty - out);
    } else if (ev.type === "BUY" || ev.type === "ASSIGNMENT_IN") {
      // Typically new lot, but support adjustments if used
      const add = ev.quantity ? Math.max(0, ev.quantity) : 0;
      qty += add;
    }
    // DIVIDEND/ADJUSTMENT handled outside basis unless you choose otherwise
  }

  const netPremium = input.premiumAllocs.reduce(
    (acc, p) => acc + toN(p.premium) - toN(p.fees),
    0,
  );

  const effectiveBasis = grossCost - netPremium;
  const effectivePricePerShare = qty > 0 ? effectiveBasis / qty : 0;

  return {
    currentQty: qty,
    grossCost: round2(grossCost),
    netPremium: round2(netPremium),
    effectiveBasis: round2(effectiveBasis),
    effectivePricePerShare: round4(effectivePricePerShare),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}
