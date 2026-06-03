import type { MarketDirection } from "@/types/predict";

export const SIMULATION_LABEL = "simplified simulation" as const;

export type SimulationLabel = typeof SIMULATION_LABEL;

export type BinarySimulationInput = {
  asset: string;
  direction: MarketDirection;
  strike: number;
  lastOraclePrice: number;
  expiry: string;
  quoteAmount: number;
  quoteAsset?: string;
};

export type RangeSimulationInput = {
  asset: string;
  lowerStrike: number;
  higherStrike: number;
  lastOraclePrice: number;
  expiry: string;
  quoteAmount: number;
  quoteAsset?: string;
};

export type SimulationResult = {
  label: SimulationLabel;
  positionType: "binary" | "vertical_range";
  condition: string;
  quoteAmount: number;
  quoteAsset: string;
  estimatedCost: number;
  potentialPayout: number;
  maxLoss: number;
  expiry: string;
  riskNote: string;
};

const BINARY_PAYOUT_MULTIPLIER = 1.8;
const RANGE_PAYOUT_MULTIPLIER = 2.2;
const DEFAULT_QUOTE_ASSET = "USDC";

const RISK_NOTE =
  "Simplified simulation for demo only. Real markets depend on live oracle settlement; payouts are not guaranteed and user approval is required.";

function assertFiniteNumber(value: number, name: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
}

function assertPositiveQuote(quoteAmount: number): void {
  assertFiniteNumber(quoteAmount, "quoteAmount");
  if (quoteAmount <= 0) {
    throw new Error("quoteAmount must be positive");
  }
}

function assertFutureExpiry(expiry: string): void {
  const expiryMs = Date.parse(expiry);
  if (Number.isNaN(expiryMs)) {
    throw new Error("expiry must be a valid ISO date string");
  }
  if (expiryMs <= Date.now()) {
    throw new Error("expiry must be in the future");
  }
}

export function simulateBinaryPosition(
  input: BinarySimulationInput,
): SimulationResult {
  assertFiniteNumber(input.strike, "strike");
  assertFiniteNumber(input.lastOraclePrice, "lastOraclePrice");
  assertPositiveQuote(input.quoteAmount);
  assertFutureExpiry(input.expiry);
  if (input.direction !== "above" && input.direction !== "below") {
    throw new Error('direction must be "above" or "below"');
  }

  const condition =
    input.direction === "above"
      ? `Pays if ${input.asset} settles above ${input.strike} at expiry`
      : `Pays if ${input.asset} settles below ${input.strike} at expiry`;

  return {
    label: SIMULATION_LABEL,
    positionType: "binary",
    condition,
    quoteAmount: input.quoteAmount,
    quoteAsset: input.quoteAsset ?? DEFAULT_QUOTE_ASSET,
    estimatedCost: input.quoteAmount,
    potentialPayout: input.quoteAmount * BINARY_PAYOUT_MULTIPLIER,
    maxLoss: input.quoteAmount,
    expiry: input.expiry,
    riskNote: RISK_NOTE,
  };
}

export function simulateRangePosition(
  input: RangeSimulationInput,
): SimulationResult {
  assertFiniteNumber(input.lowerStrike, "lowerStrike");
  assertFiniteNumber(input.higherStrike, "higherStrike");
  assertFiniteNumber(input.lastOraclePrice, "lastOraclePrice");
  assertPositiveQuote(input.quoteAmount);
  assertFutureExpiry(input.expiry);
  if (input.lowerStrike >= input.higherStrike) {
    throw new Error("lowerStrike must be less than higherStrike");
  }

  return {
    label: SIMULATION_LABEL,
    positionType: "vertical_range",
    condition: `Pays if ${input.asset} settles between ${input.lowerStrike} and ${input.higherStrike} at expiry`,
    quoteAmount: input.quoteAmount,
    quoteAsset: input.quoteAsset ?? DEFAULT_QUOTE_ASSET,
    estimatedCost: input.quoteAmount,
    potentialPayout: input.quoteAmount * RANGE_PAYOUT_MULTIPLIER,
    maxLoss: input.quoteAmount,
    expiry: input.expiry,
    riskNote: RISK_NOTE,
  };
}
