"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheckBig, X } from "lucide-react";
import { useDemoStore } from "@/lib/store/demoStore";
import { loadStoredPolicy } from "@/lib/budget/budgetPersistence";
import { useBudgetMeter } from "@/lib/budget/useBudgetMeter";

/**
 * Phase 4.9 STEP 5 — "Welcome back" reopen logic.
 *
 * On wallet connect (testnet), hydrate the AgentPolicy from localStorage, kick
 * the on-chain budget read, and surface a single welcome-back banner showing
 * remaining budget. We never prompt the user to re-authorize when remaining>0
 * and not expired — they just keep going.
 */
export function BudgetReopenGate() {
  const wallet = useDemoStore((s) => s.wallet);
  const policy = useDemoStore((s) => s.agentPolicy);
  const setAgentPolicy = useDemoStore((s) => s.setAgentPolicy);
  const budget = useBudgetMeter();

  const hydratedFor = useRef<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [justRestored, setJustRestored] = useState(false);

  useEffect(() => {
    const addr = wallet.address;
    if (!addr) {
      hydratedFor.current = null;
      setJustRestored(false);
      return;
    }
    if (hydratedFor.current === addr) return;
    hydratedFor.current = addr;

    // Already populated in-memory (just-set from the Budget step) — no banner.
    if (policy && policy.walletAddress.toLowerCase() === addr.toLowerCase()) {
      return;
    }

    const stored = loadStoredPolicy(addr);
    if (stored) {
      setAgentPolicy(stored);
      setJustRestored(true);
      // Trigger a fresh on-chain read so the meter reflects current remaining.
      void budget.refresh();
    }
  }, [wallet.address, policy, setAgentPolicy, budget]);

  if (!justRestored || dismissed || !budget.active) return null;
  if (budget.expired || budget.exhausted) return null;

  return (
    <div className="budget-banner" role="status" style={{ margin: "16px 24px 0" }}>
      <CircleCheckBig aria-hidden />
      <div style={{ flex: 1 }}>
        <p className="budget-banner-title">
          Welcome back — ${budget.remaining} of your research budget remains
        </p>
        <p className="budget-banner-body">
          {budget.predictionsLeft} predictions left under this cap. Pick a
          market to keep going — no need to re-authorize.
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss welcome-back banner"
        onClick={() => setDismissed(true)}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--muted)",
          cursor: "pointer",
        }}
      >
        <X aria-hidden />
      </button>
    </div>
  );
}

export default BudgetReopenGate;
