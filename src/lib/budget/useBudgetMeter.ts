/**
 * Drives the persistent budget meter (Phase 4.9).
 *
 * Reads on-chain `spent` via Payment Kit records, computes `remaining`, and
 * mirrors the values into the demo store so AppShell + Review can subscribe
 * without each owning their own RPC dance. Cache-fallback is automatic when
 * RPC is slow or the registry isn't configured.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import {
  computeRemaining,
  getSpent,
  readCachedPaidMarkets,
  recordPredictionPaid,
} from "./onchainBudget";
import { useDemoStore } from "@/lib/store/demoStore";

export type BudgetMeterView = {
  /** True when the policy is set and the meter should be shown. */
  active: boolean;
  cap: string;
  spent: string;
  remaining: string;
  feePerPrediction: string;
  predictionsLeft: number;
  predictionsCap: number;
  expiry: string;
  expired: boolean;
  exhausted: boolean;
  status: "idle" | "loading" | "ready" | "rpcError";
  usedCacheFallback: boolean;
};

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Ticks every 30s so `expired` flips without a manual reload. Starts at 0 (SSR-safe). */
function useNowTick(): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function useBudgetMeter(): BudgetMeterView & {
  refresh: () => Promise<void>;
  markPaid: (marketId: string) => void;
} {
  const policy = useDemoStore((s) => s.agentPolicy);
  const wallet = useDemoStore((s) => s.wallet);
  const paidMarkets = useDemoStore((s) => s.paidMarkets);
  const meter = useDemoStore((s) => s.budgetMeter);
  const setBudgetMeter = useDemoStore((s) => s.setBudgetMeter);
  const setPaidMarkets = useDemoStore((s) => s.setPaidMarkets);
  const addPaidMarket = useDemoStore((s) => s.addPaidMarket);
  const suiClient = useSuiClient();

  const cap = policy?.capAmount ?? policy?.spendingCap ?? "0";
  const fee = policy?.feePerPrediction ?? "1";
  const expiry = policy?.expiry ?? "";
  const now = useNowTick();

  const refresh = useCallback(async () => {
    if (!policy || !wallet.address) return;
    setBudgetMeter({ status: "loading" });
    try {
      const result = await getSpent(suiClient, {
        walletAddress: wallet.address,
        budgetId: policy.budgetId,
        feePerPrediction: fee,
        extraKnownMarkets: paidMarkets,
      });
      setPaidMarkets(result.paidMarkets);
      setBudgetMeter({
        status: "ready",
        spent: result.spent,
        remaining: computeRemaining(cap, result.spent),
        usedCacheFallback: result.usedCacheFallback,
      });
    } catch {
      // Hard RPC failure — fall back to cached paidMarkets so the demo still
      // shows a remaining figure rather than a broken meter.
      const cached = readCachedPaidMarkets({
        walletAddress: wallet.address,
        budgetId: policy.budgetId,
      });
      const spent = (cached.length * toNumber(fee)).toString();
      setPaidMarkets(cached);
      setBudgetMeter({
        status: "rpcError",
        spent,
        remaining: computeRemaining(cap, spent),
        usedCacheFallback: true,
      });
    }
  }, [
    policy,
    wallet.address,
    suiClient,
    cap,
    fee,
    paidMarkets,
    setBudgetMeter,
    setPaidMarkets,
  ]);

  // Initial / policy-change refresh.
  useEffect(() => {
    void refresh();
    // refresh's identity changes when paidMarkets does — avoid loop by only
    // depending on policy + wallet identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy?.budgetId, wallet.address]);

  const markPaid = useCallback(
    (marketId: string) => {
      if (!policy || !wallet.address) return;
      recordPredictionPaid(
        { walletAddress: wallet.address, budgetId: policy.budgetId },
        marketId,
        { cap, feePerPrediction: fee, expiry },
      );
      addPaidMarket(marketId);
      // Optimistic update — refresh follows asynchronously.
      void refresh();
    },
    [policy, wallet.address, cap, fee, expiry, addPaidMarket, refresh],
  );

  const view = useMemo<BudgetMeterView>(() => {
    const capNum = toNumber(cap);
    const feeNum = toNumber(fee) || 1;
    const remainingNum = toNumber(meter.remaining || cap);
    const predictionsLeft = Math.max(0, Math.floor(remainingNum / feeNum));
    const predictionsCap = Math.max(0, Math.floor(capNum / feeNum));
    const expired = !!expiry && now > 0 && Date.parse(expiry) <= now;
    const exhausted = !!policy && remainingNum <= 0;
    return {
      active: !!policy,
      cap,
      spent: meter.spent,
      remaining: meter.remaining || cap,
      feePerPrediction: fee,
      predictionsLeft,
      predictionsCap,
      expiry,
      expired,
      exhausted,
      status: meter.status,
      usedCacheFallback: meter.usedCacheFallback,
    };
  }, [policy, cap, fee, expiry, meter, now]);

  return { ...view, refresh, markPaid };
}

/** Read-only flavor for components that don't need to refresh / mark paid. */
export function useBudgetMeterView(): BudgetMeterView {
  const policy = useDemoStore((s) => s.agentPolicy);
  const meter = useDemoStore((s) => s.budgetMeter);
  const cap = policy?.capAmount ?? policy?.spendingCap ?? "0";
  const fee = policy?.feePerPrediction ?? "1";
  const expiry = policy?.expiry ?? "";
  const now = useNowTick();
  return useMemo<BudgetMeterView>(() => {
    const capNum = toNumber(cap);
    const feeNum = toNumber(fee) || 1;
    const remainingNum = toNumber(meter.remaining || cap);
    const predictionsLeft = Math.max(0, Math.floor(remainingNum / feeNum));
    const predictionsCap = Math.max(0, Math.floor(capNum / feeNum));
    const expired = !!expiry && now > 0 && Date.parse(expiry) <= now;
    const exhausted = !!policy && remainingNum <= 0;
    return {
      active: !!policy,
      cap,
      spent: meter.spent,
      remaining: meter.remaining || cap,
      feePerPrediction: fee,
      predictionsLeft,
      predictionsCap,
      expiry,
      expired,
      exhausted,
      status: meter.status,
      usedCacheFallback: meter.usedCacheFallback,
    };
  }, [policy, cap, fee, expiry, meter, now]);
}

