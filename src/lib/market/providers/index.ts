import { getMarketProvider } from "../provider";
import type { MarketDataProvider } from "../types";

let instance: MarketDataProvider | null = null;

export function getProvider(): MarketDataProvider {
  if (instance) {
    return instance;
  }

  instance = getMarketProvider();
  return instance;
}

// Back-compat: re-export the factory so existing imports keep working
export { getMarketProvider };
