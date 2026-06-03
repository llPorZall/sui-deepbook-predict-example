/**
 * Real Sui Payment Kit transaction builder (Phase 4.8 STEP 3).
 *
 * Builds a Transaction that pays DUSDC to the configured merchant via
 * `process_registry_payment` (when a registry id is set) or
 * `process_ephemeral_payment` (no registry → no dup-prevention, but still a
 * real on-chain PaymentReceipt + digest).
 *
 * Signing happens in the React layer via dApp Kit; this module never holds keys.
 */

import { PaymentKitClient } from "@mysten/payment-kit";
import type { Transaction } from "@mysten/sui/transactions";
import type { PaymentKitCompatibleClient } from "@mysten/payment-kit";
import { getPayKitConfig, type PayKitConfig } from "./payKitConfig";

const DUSDC_DECIMALS = 6;
const DUSDC_UNIT = BigInt(10) ** BigInt(DUSDC_DECIMALS);

export type BuildResearchPaymentInput = {
  walletAddress: string;
  amountDusdc: string | number;
  purpose: string;
  /** Optional override of the deterministic nonce (e.g. for force-unique UUID). */
  nonceOverride?: string;
  /** Defaults to "now" in UTC; pin in tests for stable nonces. */
  now?: Date;
};

export type BuildResearchPaymentResult = {
  transaction: Transaction;
  amountBaseUnits: bigint;
  nonce: string;
  receiver: string;
  coinType: string;
  registryMode: boolean;
  /** Composite key the on-chain Move logic uses for `EDuplicatePayment`. */
  paymentKeyParts: {
    nonce: string;
    amount: bigint;
    coinType: string;
    receiver: string;
  };
};

function utcYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Deterministic nonce: wallet+purpose+YYYY-MM-DD truncated to <=36 chars.
 * Re-submitting the same wallet/purpose on the same UTC day reproduces the
 * PaymentKey → triggers on-chain `EDuplicatePayment` (registry mode), which
 * is the live demonstration we want.
 */
export function buildResearchNonce(input: {
  walletAddress: string;
  purpose: string;
  now?: Date;
}): string {
  const wallet = input.walletAddress.toLowerCase().replace(/^0x/, "").slice(0, 12);
  const purpose = slugify(input.purpose).slice(0, 14) || "research";
  const day = utcYmd(input.now ?? new Date()).replace(/-/g, "");
  const raw = `pf-${wallet}-${purpose}-${day}`;
  return raw.length <= 36 ? raw : raw.slice(0, 36);
}

function parseAmountToBaseUnits(amount: string | number): bigint {
  const str = typeof amount === "number" ? amount.toString() : amount.trim();
  if (!str || !/^\d+(\.\d+)?$/.test(str)) {
    throw new Error(`buildResearchPayment: invalid amount "${amount}"`);
  }
  const [whole, fracRaw = ""] = str.split(".");
  const frac = (fracRaw + "0".repeat(DUSDC_DECIMALS)).slice(0, DUSDC_DECIMALS);
  const base = BigInt(whole) * DUSDC_UNIT + BigInt(frac || "0");
  if (base <= BigInt(0)) {
    throw new Error(`buildResearchPayment: amount must be > 0 (got "${amount}")`);
  }
  return base;
}

/**
 * Build a research-payment Transaction. The caller signs + executes via
 * dApp Kit's `useSignAndExecuteTransaction` (Slush).
 *
 * Reads merchant + coin type from `getPayKitConfig()` (env-backed). When
 * `NEXT_PUBLIC_PAYKIT_REGISTRY` is set we route through `processRegistryPayment`
 * for on-chain duplicate prevention; otherwise we fall back to ephemeral.
 */
export function buildResearchPayment(
  client: PaymentKitCompatibleClient,
  input: BuildResearchPaymentInput,
  config: PayKitConfig = getPayKitConfig(),
): BuildResearchPaymentResult {
  if (!input.walletAddress) {
    throw new Error("buildResearchPayment: walletAddress is required");
  }

  const amountBaseUnits = parseAmountToBaseUnits(input.amountDusdc);
  const nonce = input.nonceOverride ?? buildResearchNonce({
    walletAddress: input.walletAddress,
    purpose: input.purpose,
    now: input.now,
  });

  if (nonce.length > 36) {
    throw new Error(
      `buildResearchPayment: nonce length ${nonce.length} exceeds 36 chars (got "${nonce}")`,
    );
  }

  const payKit = new PaymentKitClient({ client });

  const common = {
    sender: input.walletAddress,
    receiver: config.merchantAddress,
    amount: amountBaseUnits,
    coinType: config.dusdcType,
    nonce,
  };

  const transaction = config.registryId
    ? payKit.tx.processRegistryPayment({
        ...common,
        registryId: config.registryId,
      })
    : payKit.tx.processEphemeralPayment(common);

  return {
    transaction,
    amountBaseUnits,
    nonce,
    receiver: config.merchantAddress,
    coinType: config.dusdcType,
    registryMode: !!config.registryId,
    paymentKeyParts: {
      nonce,
      amount: amountBaseUnits,
      coinType: config.dusdcType,
      receiver: config.merchantAddress,
    },
  };
}

export { DUSDC_DECIMALS, DUSDC_UNIT };
