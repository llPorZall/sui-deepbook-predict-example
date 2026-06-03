export type MarketType = "binary" | "vertical_range";

export type MarketDirection = "above" | "below";

export type OracleStatus =
  | "Inactive"
  | "Active"
  | "PendingSettlement"
  | "Settled";

export type DataSource = "testnet" | "simulated";

export type PredictMarket = {
  marketId: string;
  asset: string;
  quoteAsset: string;
  marketType: MarketType;
  direction?: MarketDirection;
  strike?: number;
  lowerStrike?: number;
  higherStrike?: number;
  expiry: string;
  oracleStatus: OracleStatus;
  lastOraclePrice?: number;
  /** Current oracle spot price (decimal units), from /oracles/:id/state. */
  oraclePrice?: number;
  /** Smallest tradable strike (decimal units). Strikes ladder = minStrike + n * tickSize. */
  minStrike?: number;
  /** Strike grid step (decimal units). */
  tickSize?: number;
  settlementPrice?: number;
  dataSource: DataSource;
};

export type VaultSummary = {
  vaultId: string;
  quoteAsset: string;
  totalLiquidity: string;
  liabilities: string;
  maxPayout: string;
  utilizationRate: string;
  plpSharePrice?: string;
  dataSource: DataSource;
};
