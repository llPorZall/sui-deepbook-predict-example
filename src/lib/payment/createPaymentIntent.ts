import type { GasStrategy, PaymentIntent } from "@/types/payment";
import { buildDuplicateKey } from "./duplicateProtection";

export type CreatePaymentIntentInput = {
  walletAddress: string;
  recipient: string;
  /** Decimal string e.g. "5" or "5.00". */
  amount: string;
  asset: string;
  purpose: string;
  /** Hours until the intent expires. Defaults to 24. */
  expiryHours?: number;
  /** Defaults to "simulated" — sponsored/gasless if available. */
  gasStrategy?: GasStrategy;
  /** Override the issuance time (mostly for tests). */
  now?: Date;
};

function randomId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${rand}`;
}

export function createPaymentIntent(input: CreatePaymentIntentInput): PaymentIntent {
  if (!input.walletAddress) {
    throw new Error("walletAddress is required");
  }
  if (!input.recipient) {
    throw new Error("recipient is required");
  }
  if (!input.amount || Number.isNaN(Number(input.amount)) || Number(input.amount) <= 0) {
    throw new Error("amount must be a positive number");
  }
  if (!input.purpose) {
    throw new Error("purpose is required");
  }

  const now = input.now ?? new Date();
  const expiryHours = input.expiryHours ?? 24;
  const expiry = new Date(now.getTime() + expiryHours * 3600 * 1000).toISOString();

  return {
    id: randomId("pf_intent"),
    walletAddress: input.walletAddress,
    recipient: input.recipient,
    amount: input.amount,
    asset: input.asset,
    purpose: input.purpose,
    expiry,
    gasStrategy: input.gasStrategy ?? "simulated",
    status: "draft",
    duplicateProtectionKey: buildDuplicateKey({
      walletAddress: input.walletAddress,
      purpose: input.purpose,
      date: now,
    }),
  };
}
