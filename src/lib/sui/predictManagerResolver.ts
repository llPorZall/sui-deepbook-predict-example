"use client";

import type { SuiJsonRpcClient, SuiObjectChange } from "@mysten/sui/jsonRpc";
import { createManagerTx } from "./predictTx";
import { getConfiguredManagerId } from "./predictConfig";

const STORAGE_PREFIX = "predictflow:manager:";

/**
 * Per-wallet cache: a wallet that already created its PredictManager will
 * reuse it without prompting for another signature.
 */
export function getCachedManagerId(address: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}${address}`);
  } catch {
    return null;
  }
}

export function setCachedManagerId(address: string, managerId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${address}`, managerId);
  } catch {
    /* localStorage disabled — fail open. */
  }
}

/**
 * Minimal contract over `useSignAndExecuteTransaction().mutateAsync` — kept
 * here so callers don't need to import dapp-kit types into the resolver.
 */
export type SignAndExecuteMutateAsync = (input: {
  transaction: unknown;
  chain: `sui:${string}`;
}) => Promise<{ digest: string }>;

/**
 * Resolves a PredictManager id for the signing wallet. Order:
 *   1. per-wallet localStorage cache
 *   2. NEXT_PUBLIC_PREDICT_MANAGER (fast path for the shared demo wallet)
 *   3. on-chain provisioning: signs `predict::create_manager`, reads the new
 *      id out of objectChanges, caches it, returns.
 *
 * `created` is true only when this call triggered step 3 — the UI can use it
 * to show a two-step toast ("Provisioning manager… then mint").
 */
export async function resolveManagerId(args: {
  address: string;
  suiClient: SuiJsonRpcClient;
  signAndExecute: SignAndExecuteMutateAsync;
}): Promise<{ managerId: string; created: boolean }> {
  const cached = getCachedManagerId(args.address);
  if (cached) return { managerId: cached, created: false };

  const configured = getConfiguredManagerId();
  if (configured) {
    // Cache the env-var value so subsequent calls skip the env check.
    setCachedManagerId(args.address, configured);
    return { managerId: configured, created: false };
  }

  const tx = createManagerTx();
  const submitted = await args.signAndExecute({
    transaction: tx,
    chain: "sui:testnet",
  });

  // dApp Kit's default `execute` returns only the digest — fetch the full
  // tx to read objectChanges for the new PredictManager id.
  const full = await args.suiClient.waitForTransaction({
    digest: submitted.digest,
    options: { showObjectChanges: true, showEffects: true },
  });

  const changes: SuiObjectChange[] = full.objectChanges ?? [];
  const createdManager = changes.find(
    (c): c is Extract<SuiObjectChange, { type: "created" }> =>
      c.type === "created" && /PredictManager/.test(c.objectType),
  );
  if (!createdManager) {
    throw new Error(
      "create_manager succeeded but no PredictManager was found in objectChanges",
    );
  }

  setCachedManagerId(args.address, createdManager.objectId);
  return { managerId: createdManager.objectId, created: true };
}
