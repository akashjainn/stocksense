export type BackoffOptions = {
  baseMs?: number; // initial backoff
  maxMs?: number; // cap
  maxRetries?: number;
};

export async function withBackoff<T>(fn: () => Promise<T>, opts: BackoffOptions = {}): Promise<T> {
  const base = opts.baseMs ?? 300;
  const max = opts.maxMs ?? 5000;
  const maxRetries = opts.maxRetries ?? 5;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (e: any) {
      const status = typeof e?.status === "number" ? e.status : (e?.response?.status ?? undefined);
      if (status !== 429 && status !== 503) throw e;
      if (attempt >= maxRetries) throw e;
      const delay = Math.min(max, Math.round(base * Math.pow(2, attempt)));
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
}
