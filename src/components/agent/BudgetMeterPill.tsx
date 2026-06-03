"use client";

import { Clock, Coins, Loader2, TriangleAlert, Wifi, WifiOff } from "lucide-react";
import { useBudgetMeterView } from "@/lib/budget/useBudgetMeter";

function formatExpiry(iso: string): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toISOString().slice(11, 16) + " UTC";
}

/**
 * Persistent research-budget meter. Hidden when no policy is set.
 * Used in the nav alongside the network badge.
 */
export function BudgetMeterPill({ className }: { className?: string }) {
  const meter = useBudgetMeterView();
  if (!meter.active) return null;

  const cls = ["budget-pill", className].filter(Boolean).join(" ");

  if (meter.expired) {
    return (
      <span className={`${cls} budget-pill--expired`} role="status">
        <TriangleAlert aria-hidden />
        Budget expired
      </span>
    );
  }

  if (meter.exhausted) {
    return (
      <span className={`${cls} budget-pill--exhausted`} role="status">
        <Coins aria-hidden />
        Budget used up
      </span>
    );
  }

  if (meter.status === "loading") {
    return (
      <span className={cls} role="status">
        <Loader2 aria-hidden className="spin" />
        Checking budget…
      </span>
    );
  }

  return (
    <span className={cls} role="status">
      <Coins aria-hidden />
      <span className="budget-pill-amount">
        ${meter.remaining} / ${meter.cap}
      </span>
      <span className="budget-pill-divider" aria-hidden>·</span>
      <span className="budget-pill-count">{meter.predictionsLeft} left</span>
      {meter.expiry && (
        <>
          <span className="budget-pill-divider" aria-hidden>·</span>
          <Clock aria-hidden />
          <span>expires {formatExpiry(meter.expiry)}</span>
        </>
      )}
      {meter.usedCacheFallback ? (
        <WifiOff aria-hidden className="budget-pill-rpc" />
      ) : meter.status === "ready" ? (
        <Wifi aria-hidden className="budget-pill-rpc" />
      ) : null}
    </span>
  );
}

export default BudgetMeterPill;
