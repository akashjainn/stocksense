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
  while (true) {
    try {
      return await fn();
    } catch (e: unknown) {
      type MaybeHttpError = { status?: number; response?: { status?: number } };
      const err = e as MaybeHttpError;
      const status = typeof err?.status === "number" ? err.status : (err?.response?.status ?? undefined);
      if (status !== 429 && status !== 503) throw e;
      if (attempt >= maxRetries) throw e;
      const delay = Math.min(max, Math.round(base * Math.pow(2, attempt)));
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
}
