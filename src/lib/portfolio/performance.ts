export function chainLinkTWR(dailyReturns: number[]) {
  return dailyReturns.reduce((acc, r) => acc * (1 + r), 1) - 1;
}

export function dailyReturn(prevValue: number, currValue: number, netExternalCF: number) {
  const denom = prevValue + netExternalCF;
  if (denom === 0) return 0;
  return (currValue - denom) / denom;
}

export function xirr(cashflows: { amount: number; date: Date }[], guess = 0.1) {
  const year = 365 * 24 * 3600 * 1000;
  const t0 = cashflows[0]?.date.getTime() ?? Date.now();
  const f = (r: number) =>
    cashflows.reduce(
      (s, cf) => s + cf.amount / Math.pow(1 + r, (cf.date.getTime() - t0) / year),
      0
    );
  const df = (r: number) =>
    cashflows.reduce(
      (s, cf) =>
        s +
        (-(cf.amount * ((cf.date.getTime() - t0) / year))) /
          Math.pow(1 + r, ((cf.date.getTime() - t0) / year) + 1),
      0
    );
  let r = guess;
  for (let i = 0; i < 50; i++) {
    const fr = f(r), dfr = df(r);
    if (Math.abs(fr) < 1e-7) break;
    r = r - fr / dfr;
  }
  return r;
}
