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

export type PositionStatus =
  | "Active"
  | "PendingSettlement"
  | "Settled"
  | "Redeemed";

export type PositionDirection = "Above" | "Below";

export type PortfolioPosition = {
  marketId: string;
  oracleId: string;
  asset: string;
  marketType: MarketType;
  /** Set for binary markets. */
  direction?: PositionDirection;
  /** Binary strike in decimal price units (raw server value ÷ 10^9). */
  strike?: number;
  /** Range markets — currently unused (server has no range positions endpoint). */
  lowerStrike?: number;
  higherStrike?: number;
  expiry: string;
  /** Open quantity, smallest position unit (raw server value, unscaled). */
  quantity: number;
  /** Open cost basis in DUSDC (raw ÷ 10^6). */
  cost: number;
  /** Mark-to-market value in DUSDC (raw ÷ 10^6). */
  currentValue: number;
  /** Unrealized PnL in DUSDC for the open exposure. */
  pnl: number;
  status: PositionStatus;
  /** Oracle settlement price in decimal units, once settled. */
  settlementPrice?: number;
  dataSource: DataSource;
};
