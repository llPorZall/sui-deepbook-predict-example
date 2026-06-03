import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import { PaymentKitClient, type PaymentKitCompatibleClient } from "@mysten/payment-kit";
import { getPredictConfig, type PredictConfig } from "./predictConfig";
import { getPayKitConfig, type PayKitConfig } from "@/lib/payment/payKitConfig";
import { buildPredictionNonce } from "@/lib/budget/onchainBudget";

export const SUI_CLOCK_OBJECT_ID = "0x6";

export const DUSDC_DECIMALS = 6;
const DUSDC_UNIT = BigInt(10) ** BigInt(DUSDC_DECIMALS);

export type BinaryDirection = "up" | "down";

export interface MintBinaryParams {
  managerId: string;
  oracleId: string;
  expiry: bigint;
  strike: bigint;
  direction: BinaryDirection;
  quantity: bigint;
}

export interface MintRangeParams {
  managerId: string;
  oracleId: string;
  expiry: bigint;
  lowerStrike: bigint;
  higherStrike: bigint;
  quantity: bigint;
}

const ZERO = BigInt(0);

function requirePositive(name: string, value: bigint): bigint {
  if (value <= ZERO) {
    throw new Error(`predictTx: ${name} must be a positive bigint (got ${value})`);
  }
  return value;
}

/**
 * Upper-bound cost in DUSDC base units for a binary or range position:
 * payoff per unit is at most $1, so quantity * 10^6 always covers the mint.
 */
function maxPayoutCost(quantity: bigint): bigint {
  return quantity * DUSDC_UNIT;
}

function depositDusdc(
  tx: Transaction,
  config: PredictConfig,
  managerId: string,
  amount: bigint,
): void {
  const coin = coinWithBalance({ balance: amount, type: config.dusdcType });
  tx.moveCall({
    target: `${config.packageId}::predict_manager::deposit`,
    typeArguments: [config.dusdcType],
    arguments: [tx.object(managerId), coin],
  });
}

/**
 * Creates a new PredictManager owned by the signing wallet.
 * `predict::create_manager` shares the manager and emits PredictManagerCreated.
 */
export function createManagerTx(
  config: PredictConfig = getPredictConfig(),
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${config.packageId}::predict::create_manager`,
    arguments: [],
  });
  return tx;
}

/**
 * Deposits DUSDC into the PredictManager and mints a binary position via
 * `predict::mint<Quote>`. Quote type is the configured DUSDC type.
 */
export function mintBinaryTx(
  params: MintBinaryParams,
  config: PredictConfig = getPredictConfig(),
): Transaction {
  const { managerId, oracleId } = params;
  const expiry = requirePositive("expiry", params.expiry);
  const strike = requirePositive("strike", params.strike);
  const quantity = requirePositive("quantity", params.quantity);

  const tx = new Transaction();
  depositDusdc(tx, config, managerId, maxPayoutCost(quantity));

  const marketKey = tx.moveCall({
    target: `${config.packageId}::market_key::new`,
    arguments: [
      tx.pure.id(oracleId),
      tx.pure.u64(expiry),
      tx.pure.u64(strike),
      tx.pure.bool(params.direction === "up"),
    ],
  });

  tx.moveCall({
    target: `${config.packageId}::predict::mint`,
    typeArguments: [config.dusdcType],
    arguments: [
      tx.object(config.predictObjectId),
      tx.object(managerId),
      tx.object(oracleId),
      marketKey,
      tx.pure.u64(quantity),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

/**
 * Deposits DUSDC into the PredictManager and mints a vertical-range position
 * via `predict::mint_range<Quote>`.
 */
export function mintRangeTx(
  params: MintRangeParams,
  config: PredictConfig = getPredictConfig(),
): Transaction {
  const { managerId, oracleId } = params;
  const expiry = requirePositive("expiry", params.expiry);
  const lowerStrike = requirePositive("lowerStrike", params.lowerStrike);
  const higherStrike = requirePositive("higherStrike", params.higherStrike);
  const quantity = requirePositive("quantity", params.quantity);
  if (lowerStrike >= higherStrike) {
    throw new Error(
      `predictTx: lowerStrike (${lowerStrike}) must be < higherStrike (${higherStrike})`,
    );
  }

  const tx = new Transaction();
  depositDusdc(tx, config, managerId, maxPayoutCost(quantity));

  const rangeKey = tx.moveCall({
    target: `${config.packageId}::range_key::new`,
    arguments: [
      tx.pure.id(oracleId),
      tx.pure.u64(expiry),
      tx.pure.u64(lowerStrike),
      tx.pure.u64(higherStrike),
    ],
  });

  tx.moveCall({
    target: `${config.packageId}::predict::mint_range`,
    typeArguments: [config.dusdcType],
    arguments: [
      tx.object(config.predictObjectId),
      tx.object(managerId),
      tx.object(oracleId),
      rangeKey,
      tx.pure.u64(quantity),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

// ---------- Phase 4.9: bundled per-prediction PTB ----------

export type PlacePredictionFee = {
  /** Per-prediction fee in whole DUSDC base units (typically 1 * 10^6). */
  amountBaseUnits: bigint;
  walletAddress: string;
  budgetId: string;
  marketId: string;
};

export type PlacePredictionInput =
  | ({ kind: "binary" } & MintBinaryParams & { fee: PlacePredictionFee; skipFee?: boolean })
  | ({ kind: "range" } & MintRangeParams & { fee: PlacePredictionFee; skipFee?: boolean });

export type PlacePredictionResult = {
  transaction: Transaction;
  nonce: string;
  /** Whether the PTB included the Payment Kit fee call. False when already paid. */
  feeIncluded: boolean;
  /** True when fee was routed through `process_registry_payment`. */
  registryMode: boolean;
};

function appendFeeCall(
  tx: Transaction,
  fee: PlacePredictionFee,
  payKitConfig: PayKitConfig,
  payKitClient: PaymentKitCompatibleClient,
): { nonce: string; registryMode: boolean } {
  const nonce = buildPredictionNonce({
    walletAddress: fee.walletAddress,
    budgetId: fee.budgetId,
    marketId: fee.marketId,
  });
  const payKit = new PaymentKitClient({ client: payKitClient });
  const common = {
    sender: fee.walletAddress,
    nonce,
    coinType: payKitConfig.dusdcType,
    amount: fee.amountBaseUnits,
    receiver: payKitConfig.merchantAddress,
  };
  if (payKitConfig.registryId) {
    tx.add(
      payKit.calls.processRegistryPayment({
        ...common,
        registryId: payKitConfig.registryId,
      }),
    );
    return { nonce, registryMode: true };
  }
  tx.add(payKit.calls.processEphemeralPayment(common));
  return { nonce, registryMode: false };
}

/**
 * Builds a single PTB: (1) Payment Kit `$1` fee → merchant under the
 * per-prediction nonce, then (2) `predict::mint` (or `mint_range`). Both
 * succeed or fail together; one explorer digest covers both.
 *
 * When `skipFee` is set (this market's fee is already on chain), only the
 * mint call is appended — the position is "free".
 *
 * The Payment Kit SDK needs a `PaymentKitCompatibleClient` to build the call;
 * the caller threads in the React-layer `useSuiClient()` instance.
 */
export function placePredictionTx(
  input: PlacePredictionInput,
  payKitClient: PaymentKitCompatibleClient,
  predictConfig: PredictConfig = getPredictConfig(),
  payKitConfig: PayKitConfig = getPayKitConfig(),
): PlacePredictionResult {
  const tx = new Transaction();

  let feeIncluded = false;
  let registryMode = false;
  let nonce = buildPredictionNonce({
    walletAddress: input.fee.walletAddress,
    budgetId: input.fee.budgetId,
    marketId: input.fee.marketId,
  });

  if (!input.skipFee) {
    const result = appendFeeCall(tx, input.fee, payKitConfig, payKitClient);
    nonce = result.nonce;
    registryMode = result.registryMode;
    feeIncluded = true;
  }

  if (input.kind === "binary") {
    const expiry = requirePositive("expiry", input.expiry);
    const strike = requirePositive("strike", input.strike);
    const quantity = requirePositive("quantity", input.quantity);
    depositDusdc(tx, predictConfig, input.managerId, maxPayoutCost(quantity));
    const marketKey = tx.moveCall({
      target: `${predictConfig.packageId}::market_key::new`,
      arguments: [
        tx.pure.id(input.oracleId),
        tx.pure.u64(expiry),
        tx.pure.u64(strike),
        tx.pure.bool(input.direction === "up"),
      ],
    });
    tx.moveCall({
      target: `${predictConfig.packageId}::predict::mint`,
      typeArguments: [predictConfig.dusdcType],
      arguments: [
        tx.object(predictConfig.predictObjectId),
        tx.object(input.managerId),
        tx.object(input.oracleId),
        marketKey,
        tx.pure.u64(quantity),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  } else {
    const expiry = requirePositive("expiry", input.expiry);
    const lowerStrike = requirePositive("lowerStrike", input.lowerStrike);
    const higherStrike = requirePositive("higherStrike", input.higherStrike);
    const quantity = requirePositive("quantity", input.quantity);
    if (lowerStrike >= higherStrike) {
      throw new Error(
        `predictTx: lowerStrike (${lowerStrike}) must be < higherStrike (${higherStrike})`,
      );
    }
    depositDusdc(tx, predictConfig, input.managerId, maxPayoutCost(quantity));
    const rangeKey = tx.moveCall({
      target: `${predictConfig.packageId}::range_key::new`,
      arguments: [
        tx.pure.id(input.oracleId),
        tx.pure.u64(expiry),
        tx.pure.u64(lowerStrike),
        tx.pure.u64(higherStrike),
      ],
    });
    tx.moveCall({
      target: `${predictConfig.packageId}::predict::mint_range`,
      typeArguments: [predictConfig.dusdcType],
      arguments: [
        tx.object(predictConfig.predictObjectId),
        tx.object(input.managerId),
        tx.object(input.oracleId),
        rangeKey,
        tx.pure.u64(quantity),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  }

  return { transaction: tx, nonce, feeIncluded, registryMode };
}

export { DUSDC_UNIT };
