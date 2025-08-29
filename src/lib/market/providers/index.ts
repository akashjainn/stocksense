import { PROVIDER } from "../provider";
import type { MarketDataProvider } from "../types";
import { PolygonProvider } from "./polygon";

let instance: MarketDataProvider | null = null;

export function getMarketProvider(): MarketDataProvider {
  if (instance) return instance;
  switch (PROVIDER) {
    case 'polygon':
    default:
      instance = new PolygonProvider();
      return instance;
  }
}
