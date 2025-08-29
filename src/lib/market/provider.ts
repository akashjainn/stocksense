import { MarketDataProvider } from "./types";
import * as alpaca from "./providers/alpaca";

const providers: { [key: string]: MarketDataProvider } = {
  alpaca,
};

export function getMarketProvider(): MarketDataProvider {
  const providerName = process.env.MARKET_DATA_PROVIDER;

  if (providerName && providers[providerName]) {
    return providers[providerName];
  }

  // Default to alpaca if not specified
  if (providers.alpaca) {
    return providers.alpaca;
  }

  throw new Error(`Market data provider not found: ${providerName}`);
}
