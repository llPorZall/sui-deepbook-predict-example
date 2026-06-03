import type { PaymentIntent, Receipt, ReceiptStatus } from "@/types/payment";

const STORAGE_KEY = "predictflow.receipts.v1";

/**
 * Persisted receipts also carry the originating intent's `duplicateProtectionKey`
 * so we can reject a re-submission of the same wallet+purpose+day combination.
 * The field is not part of the public Receipt type (PRD §14.3); it lives only
 * in storage and contains no sensitive data.
 */
export type StoredReceipt = Receipt & { duplicateProtectionKey: string };

export type CreateReceiptInput = {
  intent: PaymentIntent;
  status?: ReceiptStatus;
  network?: string;
  txDigest?: string;
  /** Override the receipt time (mostly for tests). */
  now?: Date;
};

function randomId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}_${rand}`;
}

export function createReceipt(input: CreateReceiptInput): StoredReceipt {
  const now = input.now ?? new Date();
  return {
    receiptId: randomId("pf_rcpt"),
    paymentIntentId: input.intent.id,
    walletAddress: input.intent.walletAddress,
    recipient: input.intent.recipient,
    amount: input.intent.amount,
    asset: input.intent.asset,
    purpose: input.intent.purpose,
    timestamp: now.toISOString(),
    network: input.network ?? "sui:testnet",
    txDigest: input.txDigest,
    status: input.status ?? (input.txDigest ? "paid" : "simulated"),
    duplicateProtectionKey: input.intent.duplicateProtectionKey,
  };
}

/**
 * Receipt persistence — localStorage, browser-only.
 * CLAUDE.md rule #3: only non-sensitive fields are stored. Receipts contain
 * public addresses, amounts, purposes, and tx digests — never keys or seeds.
 */

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function listStoredReceipts(): StoredReceipt[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredReceipt[]) : [];
  } catch {
    return [];
  }
}

export function persistReceipt(receipt: StoredReceipt): StoredReceipt[] {
  const all = listStoredReceipts();
  const next = [receipt, ...all.filter((r) => r.receiptId !== receipt.receiptId)];
  if (hasStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage may be full or disabled — receipts still flow via the demo store.
    }
  }
  return next;
}

export function clearStoredReceipts(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function receiptToJson(receipt: Receipt): string {
  return JSON.stringify(receipt, null, 2);
}

export function downloadReceiptJson(receipt: Receipt): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([receiptToJson(receipt)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${receipt.receiptId}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyReceiptJson(receipt: Receipt): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  await navigator.clipboard.writeText(receiptToJson(receipt));
}
