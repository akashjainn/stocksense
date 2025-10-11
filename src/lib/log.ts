// Lightweight debug logging utility. Enable by setting NEXT_PUBLIC_DEBUG=1 (client) or DEBUG=1 (server).
export const DEBUG = (process.env.NEXT_PUBLIC_DEBUG === '1') || (process.env.DEBUG === '1') || (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEBUG !== '0');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dlog = (...args: any[]) => { if (DEBUG) console.log(...args); };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dwarn = (...args: any[]) => { if (DEBUG) console.warn(...args); };
// Always keep errors (observability) but still gate if desired
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const derr = (...args: any[]) => { console.error(...args); };
