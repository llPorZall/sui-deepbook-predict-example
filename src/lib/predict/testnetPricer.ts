import { Transaction } from "@mysten/sui/transactions";
import type { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { bcs } from "@mysten/sui/bcs";
import { getPredictConfig, type PredictConfig } from "@/lib/sui/predictConfig";
import { SUI_CLOCK_OBJECT_ID } from "@/lib/sui/predictTx";

export const PRICE_DECIMALS = 9;
export const PRICE_UNIT = BigInt(10) ** BigInt(PRICE_DECIMALS);
// DUSDC has 6 decimals — get_trade_amounts returns (cost, max_payout)
// in DUSDC base units.
const DUSDC_DECIMALS = 6;
const DUSDC_UNIT = BigInt(10) ** BigInt(DUSDC_DECIMALS);

// devInspect requires a sender but accepts any well-formed address — the
// call is read-only and never executed on-chain.
const DEV_INSPECT_SENDER =
  "0x0000000000000000000000000000000000000000000000000000000000000001";

export type GetTradeAmountsArgs = {
  suiClient: SuiJsonRpcClient;
  oracleId: string;
  expiryMs: bigint;
  /** Strike in native scaled units (price × 10^9). */
  strikeNative: bigint;
  isAbove: boolean;
  /**
   * Quote amount in DUSDC base units (×10^6). Callers that hold a decimal
   * dollar amount should use `dusdcAmountToBase(usd)` to convert first.
   */
  quoteAmountBase: bigint;
  /**
   * devInspect sender. Required for the pricing call to actually execute —
   * a missing/invalid sender silently returns empty `returnValues`.
   */
  sender?: string;
  config?: PredictConfig;
};

export type TradeAmounts = {
  /** Cost in DUSDC base units (10^6 = 1 DUSDC). */
  cost: bigint;
  /** Max payout in DUSDC base units. */
  maxPayout: bigint;
};

/** Convert a decimal-USD price (e.g. 66363.5) to native u64 scaled units. */
export function toStrikeNative(priceUsd: number): bigint {
  // Multiply in floats then round to integer to avoid floating-point drift
  // around tick boundaries — callers should already snap to a tick.
  return BigInt(Math.round(priceUsd * Number(PRICE_UNIT)));
}

/** Convert a decimal DUSDC dollar amount (e.g. 100) to base units (×10^6). */
export function dusdcAmountToBase(amountUsd: number): bigint {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return BigInt(0);
  return BigInt(Math.round(amountUsd * Number(DUSDC_UNIT)));
}

/** Snap a decimal price to the nearest tick at or above `minStrike`. */
export function snapStrikeToTick(
  price: number,
  minStrike: number,
  tickSize: number,
): number {
  if (!Number.isFinite(price) || !Number.isFinite(minStrike) || !Number.isFinite(tickSize) || tickSize <= 0) {
    return Math.max(minStrike, price);
  }
  const offset = Math.max(0, price - minStrike);
  const steps = Math.round(offset / tickSize);
  return minStrike + steps * tickSize;
}

/**
 * Calls `predict::get_trade_amounts` via devInspect to price a binary position
 * against the live DeepBook Predict on-chain state. Returns (cost, max_payout)
 * in DUSDC base units.
 */
export async function getBinaryTradeAmounts(
  args: GetTradeAmountsArgs,
): Promise<TradeAmounts> {
  const config = args.config ?? getPredictConfig();
  const tx = new Transaction();

  const marketKey = tx.moveCall({
    target: `${config.packageId}::market_key::new`,
    arguments: [
      tx.pure.id(args.oracleId),
      tx.pure.u64(args.expiryMs),
      tx.pure.u64(args.strikeNative),
      tx.pure.bool(args.isAbove),
    ],
  });

  tx.moveCall({
    target: `${config.packageId}::predict::get_trade_amounts`,
    arguments: [
      tx.object(config.predictObjectId),
      tx.object(args.oracleId),
      marketKey,
      tx.pure.u64(args.quoteAmountBase),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  const sender = args.sender ?? DEV_INSPECT_SENDER;

  // Diagnostic: log exactly what we're about to send so the user can verify
  // strike is ×10^9, quote is ×10^6, and the sender is the connected wallet.
  // eslint-disable-next-line no-console
  console.log("[predict.get_trade_amounts] args", {
    packageId: config.packageId,
    predictObjectId: config.predictObjectId,
    oracleId: args.oracleId,
    expiryMs: args.expiryMs.toString(),
    strikeNative: args.strikeNative.toString(),
    isAbove: args.isAbove,
    quoteAmountBase: args.quoteAmountBase.toString(),
    sender,
  });

  const result = await args.suiClient.devInspectTransactionBlock({
    transactionBlock: tx,
    sender,
  });

  // eslint-disable-next-line no-console
  console.log("[predict.get_trade_amounts] raw devInspect result", {
    status: result.effects?.status,
    error: result.error,
    callCount: result.results?.length ?? 0,
    lastReturnValues: result.results?.[result.results.length - 1]?.returnValues,
  });

  if (result.error) {
    throw new Error(`get_trade_amounts devInspect failed: ${result.error}`);
  }

  // Last call's returnValues holds (cost, max_payout) as two BCS-encoded u64s.
  const calls = result.results ?? [];
  const last = calls[calls.length - 1];
  const ret = last?.returnValues ?? [];
  if (ret.length < 2) {
    throw new Error(
      `get_trade_amounts returned ${ret.length} values; expected 2`,
    );
  }
  const cost = bcs.u64().parse(Uint8Array.from(ret[0][0]));
  const maxPayout = bcs.u64().parse(Uint8Array.from(ret[1][0]));
  // eslint-disable-next-line no-console
  console.log("[predict.get_trade_amounts] decoded", {
    costBase: cost.toString(),
    maxPayoutBase: maxPayout.toString(),
    costUsd: dusdcBaseToNumber(BigInt(cost)),
    maxPayoutUsd: dusdcBaseToNumber(BigInt(maxPayout)),
  });
  return { cost: BigInt(cost), maxPayout: BigInt(maxPayout) };
}

export type GetRangeTradeAmountsArgs = {
  suiClient: SuiJsonRpcClient;
  oracleId: string;
  expiryMs: bigint;
  /** Lower strike in native scaled units. */
  lowerStrikeNative: bigint;
  /** Higher strike in native scaled units. */
  higherStrikeNative: bigint;
  /** Quote amount in DUSDC base units (×10^6). */
  quoteAmountBase: bigint;
  sender?: string;
  config?: PredictConfig;
};

/**
 * Calls `predict::get_range_trade_amounts` via devInspect to price a vertical
 * range position. Returns (cost, max_payout) in DUSDC base units.
 */
export async function getRangeTradeAmounts(
  args: GetRangeTradeAmountsArgs,
): Promise<TradeAmounts> {
  const config = args.config ?? getPredictConfig();
  const tx = new Transaction();

  const rangeKey = tx.moveCall({
    target: `${config.packageId}::range_key::new`,
    arguments: [
      tx.pure.id(args.oracleId),
      tx.pure.u64(args.expiryMs),
      tx.pure.u64(args.lowerStrikeNative),
      tx.pure.u64(args.higherStrikeNative),
    ],
  });

  tx.moveCall({
    target: `${config.packageId}::predict::get_range_trade_amounts`,
    arguments: [
      tx.object(config.predictObjectId),
      tx.object(args.oracleId),
      rangeKey,
      tx.pure.u64(args.quoteAmountBase),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  const sender = args.sender ?? DEV_INSPECT_SENDER;

  // eslint-disable-next-line no-console
  console.log("[predict.get_range_trade_amounts] args", {
    packageId: config.packageId,
    predictObjectId: config.predictObjectId,
    oracleId: args.oracleId,
    expiryMs: args.expiryMs.toString(),
    lowerStrikeNative: args.lowerStrikeNative.toString(),
    higherStrikeNative: args.higherStrikeNative.toString(),
    quoteAmountBase: args.quoteAmountBase.toString(),
    sender,
  });

  const result = await args.suiClient.devInspectTransactionBlock({
    transactionBlock: tx,
    sender,
  });

  // eslint-disable-next-line no-console
  console.log("[predict.get_range_trade_amounts] raw devInspect result", {
    status: result.effects?.status,
    error: result.error,
    callCount: result.results?.length ?? 0,
    lastReturnValues: result.results?.[result.results.length - 1]?.returnValues,
  });

  if (result.error) {
    throw new Error(`get_range_trade_amounts devInspect failed: ${result.error}`);
  }

  const calls = result.results ?? [];
  const last = calls[calls.length - 1];
  const ret = last?.returnValues ?? [];
  if (ret.length < 2) {
    throw new Error(
      `get_range_trade_amounts returned ${ret.length} values; expected 2`,
    );
  }
  const cost = bcs.u64().parse(Uint8Array.from(ret[0][0]));
  const maxPayout = bcs.u64().parse(Uint8Array.from(ret[1][0]));
  // eslint-disable-next-line no-console
  console.log("[predict.get_range_trade_amounts] decoded", {
    costBase: cost.toString(),
    maxPayoutBase: maxPayout.toString(),
    costUsd: dusdcBaseToNumber(BigInt(cost)),
    maxPayoutUsd: dusdcBaseToNumber(BigInt(maxPayout)),
  });
  return { cost: BigInt(cost), maxPayout: BigInt(maxPayout) };
}

export function dusdcBaseToNumber(base: bigint): number {
  // 1 DUSDC = 10^6 base units. Demo amounts are small ($<1k), so a Number
  // can losslessly hold the dollar value.
  return Number(base) / Number(DUSDC_UNIT);
}

/**
 * Translate raw devInspect / MoveAbort strings from the DeepBook Predict
 * pricing engine into a short, user-readable hint. Falls back to the raw
 * message when the pattern is unknown so we never hide debug detail.
 */
export function friendlyPricingError(raw: string): string {
  if (raw.includes("quote_spread_from_fair_price")) {
    return "Pricing engine refused to quote this strike — try a strike further from the spot price, or pick a market that expires further in the future.";
  }
  if (raw.includes("E_MARKET_EXPIRED") || raw.includes("market_expired")) {
    return "This market has already expired — pick a market with time left on its clock.";
  }
  if (raw.includes("E_INSUFFICIENT_LIQUIDITY") || raw.includes("insufficient_liquidity")) {
    return "DeepBook Predict has no resting orders at this strike — try a different strike or a smaller quantity.";
  }
  return raw;
}
