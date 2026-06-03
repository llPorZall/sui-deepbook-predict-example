/**
 * On-chain bounded-budget read layer (Phase 4.9).
 *
 * The "budget" is implicit on-chain: each prediction's $1 fee is a Payment Kit
 * payment whose nonce is `pf-<wallet>-<budgetId>-<marketId>`. We don't store the
 * cap on-chain — we derive `spent` from Payment Kit records (registry mode) and
 * compute `remaining = cap - spent`.
 *
 * For each prediction we know about, the SDK's `getPaymentRecord` tells us
 * whether the fee was already charged. We persist the set of paid marketIds in
 * localStorage as a cache so reopening the app is fast (and works offline) —
 * but the SDK call remains the source of truth.
 */

import { PaymentKitClient, type PaymentKitCompatibleClient } from "@mysten/payment-kit";
import { getPayKitConfig, type PayKitConfig } from "@/lib/payment/payKitConfig";
import { DUSDC_DECIMALS } from "@/lib/payment/suiPaymentTx";

const DUSDC_UNIT = BigInt(10) ** BigInt(DUSDC_DECIMALS);

/** Cache shape kept in localStorage per (wallet, budgetId). */
type BudgetCache = {
  cap: string;
  feePerPrediction: string;
  paidMarkets: string[];
  expiry: string;
  /** Last on-chain verification timestamp (ms since epoch). */
  lastCheckedAt: number;
};

const STORAGE_PREFIX = "pf:budget:";

function storageKey(wallet: string, budgetId: string): string {
  return `${STORAGE_PREFIX}${wallet.toLowerCase()}:${budgetId}`;
}

function safeReadCache(wallet: string, budgetId: string): BudgetCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(wallet, budgetId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BudgetCache;
    if (!Array.isArray(parsed.paidMarkets)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function safeWriteCache(
  wallet: string,
  budgetId: string,
  patch: Partial<BudgetCache>,
): void {
  if (typeof window === "undefined") return;
  try {
    const current = safeReadCache(wallet, budgetId);
    const next: BudgetCache = {
      cap: current?.cap ?? "0",
      feePerPrediction: current?.feePerPrediction ?? "1",
      paidMarkets: current?.paidMarkets ?? [],
      expiry: current?.expiry ?? "",
      lastCheckedAt: current?.lastCheckedAt ?? 0,
      ...patch,
    };
    window.localStorage.setItem(storageKey(wallet, budgetId), JSON.stringify(next));
  } catch {
    // localStorage may be unavailable (private mode, quota). Caching is
    // best-effort — on-chain remains source of truth when available.
  }
}

export type BudgetIdentity = {
  walletAddress: string;
  budgetId: string;
};

/**
 * Deterministic per-prediction nonce. Mirrors Payment Kit's <=36 char limit.
 * The first 12 hex chars of the wallet are enough to be unique-per-user, and
 * we hash-truncate marketId to stay under 36.
 */
export function buildPredictionNonce(input: {
  walletAddress: string;
  budgetId: string;
  marketId: string;
}): string {
  const wallet = input.walletAddress.toLowerCase().replace(/^0x/, "").slice(0, 8);
  const budget = input.budgetId.replace(/[^a-z0-9]/gi, "").slice(0, 8);
  const market = input.marketId.toLowerCase().replace(/^0x/, "").slice(0, 12);
  const raw = `pf-${wallet}-${budget}-${market}`;
  return raw.length <= 36 ? raw : raw.slice(0, 36);
}

function feeBaseUnits(feePerPrediction: string): bigint {
  const n = Number(feePerPrediction);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`onchainBudget: invalid feePerPrediction "${feePerPrediction}"`);
  }
  // Whole-dollar fee in the demo — multiply directly to avoid float drift.
  return BigInt(Math.round(n)) * DUSDC_UNIT;
}

/** Pure helper — used in tests and in the meter. */
export function computeRemaining(cap: string, spent: string): string {
  const c = Number(cap);
  const s = Number(spent);
  const rem = Math.max(0, (Number.isFinite(c) ? c : 0) - (Number.isFinite(s) ? s : 0));
  // Whole-dollar resolution in the demo.
  return rem.toString();
}

/** Returns true if the merchant payment for this specific market was already recorded. */
export async function isPredictionPaid(
  client: PaymentKitCompatibleClient,
  identity: BudgetIdentity & { marketId: string; feePerPrediction: string },
  config: PayKitConfig = getPayKitConfig(),
): Promise<boolean> {
  if (!config.registryId) {
    // No registry → no on-chain dedupe. Fall back to localStorage cache.
    const cache = safeReadCache(identity.walletAddress, identity.budgetId);
    return cache?.paidMarkets.includes(identity.marketId) ?? false;
  }
  const nonce = buildPredictionNonce(identity);
  const payKit = new PaymentKitClient({ client });
  try {
    const record = await payKit.getPaymentRecord({
      registryId: config.registryId,
      nonce,
      amount: feeBaseUnits(identity.feePerPrediction),
      receiver: config.merchantAddress,
      coinType: config.dusdcType,
    });
    return record !== null;
  } catch {
    const cache = safeReadCache(identity.walletAddress, identity.budgetId);
    return cache?.paidMarkets.includes(identity.marketId) ?? false;
  }
}

export type GetSpentResult = {
  /** Decimal-USD string. */
  spent: string;
  /** marketIds whose fee was confirmed paid (on-chain or cache fallback). */
  paidMarkets: string[];
  /** True if we had to fall back to cache because on-chain verification failed. */
  usedCacheFallback: boolean;
};

/**
 * Computes spent for this wallet+budgetId by checking each known marketId. Known
 * markets come from the localStorage cache merged with whatever the caller has
 * observed this session — we cannot enumerate unseen markets without a heavy
 * event scan, and a market that was never paid contributes zero either way.
 */
export async function getSpent(
  client: PaymentKitCompatibleClient,
  identity: BudgetIdentity & {
    feePerPrediction: string;
    extraKnownMarkets?: readonly string[];
  },
  config: PayKitConfig = getPayKitConfig(),
): Promise<GetSpentResult> {
  const cache = safeReadCache(identity.walletAddress, identity.budgetId);
  const known = new Set<string>([
    ...(cache?.paidMarkets ?? []),
    ...(identity.extraKnownMarkets ?? []),
  ]);

  let usedCacheFallback = false;

  if (!config.registryId || known.size === 0) {
    const paidMarkets = [...known];
    const spent = (paidMarkets.length * Number(identity.feePerPrediction)).toString();
    return { spent, paidMarkets, usedCacheFallback: true };
  }

  const verified: string[] = [];
  await Promise.all(
    [...known].map(async (marketId) => {
      try {
        const paid = await isPredictionPaid(
          client,
          { ...identity, marketId },
          config,
        );
        if (paid) verified.push(marketId);
      } catch {
        usedCacheFallback = true;
        // Cache fallback: assume cached entry is correct.
        if (cache?.paidMarkets.includes(marketId)) verified.push(marketId);
      }
    }),
  );

  const spent = (verified.length * Number(identity.feePerPrediction)).toString();
  safeWriteCache(identity.walletAddress, identity.budgetId, {
    paidMarkets: verified,
    lastCheckedAt: Date.now(),
  });
  return { spent, paidMarkets: verified, usedCacheFallback };
}

/** Records a freshly-placed prediction in the local cache so reopen can replay. */
export function recordPredictionPaid(
  identity: BudgetIdentity,
  marketId: string,
  meta?: { cap?: string; feePerPrediction?: string; expiry?: string },
): void {
  const cache = safeReadCache(identity.walletAddress, identity.budgetId);
  const next = new Set<string>(cache?.paidMarkets ?? []);
  next.add(marketId);
  safeWriteCache(identity.walletAddress, identity.budgetId, {
    paidMarkets: [...next],
    cap: meta?.cap ?? cache?.cap ?? "0",
    feePerPrediction: meta?.feePerPrediction ?? cache?.feePerPrediction ?? "1",
    expiry: meta?.expiry ?? cache?.expiry ?? "",
    lastCheckedAt: Date.now(),
  });
}

/** Reads the cached paidMarkets without an on-chain round-trip. */
export function readCachedPaidMarkets(identity: BudgetIdentity): string[] {
  const cache = safeReadCache(identity.walletAddress, identity.budgetId);
  return cache?.paidMarkets ?? [];
}

export function clearBudgetCache(identity: BudgetIdentity): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(
      storageKey(identity.walletAddress, identity.budgetId),
    );
  } catch {
    // ignore
  }
}
