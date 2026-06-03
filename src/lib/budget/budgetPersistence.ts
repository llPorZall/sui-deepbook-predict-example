/**
 * Persists the active AgentPolicy + paidMarkets so a page reload doesn't
 * re-prompt the user to authorize a new budget (Phase 4.9 STEP 5).
 *
 * On-chain remains source of truth for `spent` — this is just enough state
 * for the app to know "which budget do I hold for this wallet?" after a
 * refresh.
 */

import type { AgentPolicy } from "@/types/agent";

const KEY = "pf:agentPolicy";

export type StoredPolicy = {
  policy: AgentPolicy;
  /** Lowercased wallet — guards against picking up another wallet's policy. */
  walletKey: string;
  savedAt: number;
};

export function saveStoredPolicy(policy: AgentPolicy): void {
  if (typeof window === "undefined") return;
  if (!policy.walletAddress) return;
  try {
    const payload: StoredPolicy = {
      policy,
      walletKey: policy.walletAddress.toLowerCase(),
      savedAt: Date.now(),
    };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Best-effort.
  }
}

export function loadStoredPolicy(walletAddress: string | undefined): AgentPolicy | null {
  if (typeof window === "undefined") return null;
  if (!walletAddress) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPolicy;
    if (parsed.walletKey !== walletAddress.toLowerCase()) return null;
    // Don't restore an expired policy — the user must set a new one.
    if (parsed.policy.expiry && Date.parse(parsed.policy.expiry) <= Date.now()) {
      return null;
    }
    return parsed.policy;
  } catch {
    return null;
  }
}

export function clearStoredPolicy(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
