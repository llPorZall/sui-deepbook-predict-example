/**
 * Duplicate-payment protection.
 *
 * Per PRD §14.2 the `duplicateProtectionKey` follows the pattern
 *   wallet-purpose-date
 * giving one canonical key per payer + purpose + UTC day so a re-submitted
 * intent is recognized as a duplicate rather than charged twice.
 */

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function toUtcDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type DuplicateKeyInput = {
  walletAddress: string;
  purpose: string;
  /** Defaults to "now" in UTC. */
  date?: Date;
};

export function buildDuplicateKey(input: DuplicateKeyInput): string {
  const wallet = input.walletAddress.toLowerCase().slice(0, 18);
  const purpose = slugify(input.purpose) || "payment";
  const date = toUtcDate(input.date ?? new Date());
  return `${wallet}-${purpose}-${date}`;
}

/**
 * Testnet variant — mirrors the on-chain `PaymentKey<CoinType>` composite
 * (nonce + amount + coinType + receiver) so the app-side dedupe matches what
 * `process_registry_payment` enforces via `EDuplicatePayment`.
 */
export type PaymentKeyInput = {
  nonce: string;
  amount: bigint | number | string;
  coinType: string;
  receiver: string;
};

export function buildOnChainPaymentKey(input: PaymentKeyInput): string {
  const amount = typeof input.amount === "bigint"
    ? input.amount.toString()
    : String(input.amount);
  const receiver = input.receiver.toLowerCase();
  return `paykit|${input.nonce}|${amount}|${input.coinType}|${receiver}`;
}

export type DuplicateMatch<T extends { duplicateProtectionKey?: string }> = {
  key: string;
  existing: T | null;
};

export function findDuplicate<T extends { duplicateProtectionKey?: string }>(
  records: readonly T[],
  key: string,
): DuplicateMatch<T> {
  return {
    key,
    existing: records.find((r) => r.duplicateProtectionKey === key) ?? null,
  };
}
