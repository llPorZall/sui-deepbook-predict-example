"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Coins,
  Droplet,
  ListChecks,
  Lock,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { DEMO_STEPS, useDemoStore } from "@/lib/store/demoStore";
import { ActionButton } from "@/components/ui/ActionButton";
import { toast } from "@/lib/toast/toastStore";
import { FEE_PER_PREDICTION, type AgentPolicy } from "@/types/agent";
import { saveStoredPolicy } from "@/lib/budget/budgetPersistence";

const PURPOSES = [
  "Market research",
  "News & sentiment summary",
  "Odds & pricing analysis",
  "On-chain data lookup",
];
const EXPIRY_HOURS: Record<string, number> = {
  "1h": 1,
  "24h": 24,
  "7d": 24 * 7,
};
const AMOUNT_CHIPS = ["5", "10", "25", "50"];
const DEMO_RECIPIENT = "0x9c12c43a8b5e7f0d4a91b2c3d4e5f60718293ab07";

function randomId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export default function BudgetPage() {
  const router = useRouter();
  const wallet = useDemoStore((s) => s.wallet);
  const setAgentPolicy = useDemoStore((s) => s.setAgentPolicy);
  const setCurrentStep = useDemoStore((s) => s.setCurrentStep);

  useEffect(() => {
    setCurrentStep(DEMO_STEPS.budget);
  }, [setCurrentStep]);

  const [amount, setAmount] = useState("5");
  const [asset, setAsset] = useState<"USDC" | "SUI">("USDC");
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [expiry, setExpiry] = useState<keyof typeof EXPIRY_HOURS>("24h");
  const [approval, setApproval] = useState<"final" | "research_only">("final");

  const expiryLabel = expiry === "1h" ? "1 hour" : expiry === "24h" ? "24 hours" : "7 days";

  const policy = useMemo<AgentPolicy>(() => {
    const expiryIso = new Date(
      Date.now() + EXPIRY_HOURS[expiry] * 3600 * 1000,
    ).toISOString();
    return {
      policyId: randomId("pf_policy"),
      walletAddress: wallet.address ?? "",
      spendingCap: amount,
      capAmount: amount,
      feePerPrediction: FEE_PER_PREDICTION,
      budgetId: randomId("budget"),
      asset,
      allowedRecipient: DEMO_RECIPIENT,
      purpose,
      expiry: expiryIso,
      frequencyLimit: 1,
      finalActionRequiresUserSignature: approval === "final",
    };
  }, [amount, asset, purpose, expiry, approval, wallet.address]);

  // = N predictions available (cap / fee). Floored; never negative.
  const predictionsAvailable = useMemo(() => {
    const cap = Number(amount) || 0;
    const fee = Number(FEE_PER_PREDICTION) || 1;
    return Math.max(0, Math.floor(cap / fee));
  }, [amount]);

  const adjust = (delta: number) => {
    const n = Math.max(1, Math.round((Number(amount) || 0) + delta));
    setAmount(String(n));
  };

  const onContinue = async () => {
    if (!wallet.address) {
      throw new Error("Connect a wallet before continuing");
    }
    if (!(Number(amount) > 0)) {
      throw new Error("Budget amount must be greater than zero");
    }
    setAgentPolicy(policy);
    saveStoredPolicy(policy);
    // Brief await so the loading state is visible before navigation.
    await new Promise((r) => setTimeout(r, 200));
    router.push("/payment");
  };

  const onReset = () => {
    setAmount("5");
    setAsset("USDC");
    setPurpose(PURPOSES[0]);
    setExpiry("24h");
    setApproval("final");
    toast.info("Reset to defaults");
  };

  return (
    <AppShell currentStep={DEMO_STEPS.budget}>
      <div className="budget-main">
        <div className="page-head page-head--left">
          <h1 className="page-title">Research budget cap</h1>
          <p className="page-sub">
            Authorize a spending cap. No funds move now — each prediction
            deducts {FEE_PER_PREDICTION} testnet {asset} from the cap when you
            sign on-chain.
          </p>
        </div>

        <div className="budget-grid">
          {/* ---------- Form ---------- */}
          <section className="form-panel">
            {/* Budget amount */}
            <div className="field">
              <label className="field-label" htmlFor="budget-amount">
                <CircleDollarSign aria-hidden />
                Authorization cap
              </label>
              <p className="field-help">
                Maximum the agent may spend during this session. Money moves
                per prediction, not now.
              </p>
              <div className="amount-row">
                <div className="amount-input">
                  <input
                    id="budget-amount"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={amount}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                      setAmount(digitsOnly);
                    }}
                  />
                  <span className="unit">testnet {asset}</span>
                </div>
                <div className="step-btns">
                  <button
                    type="button"
                    className="step-btn"
                    aria-label="Decrease budget"
                    onClick={() => adjust(-1)}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="step-btn"
                    aria-label="Increase budget"
                    onClick={() => adjust(1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="chips">
                {AMOUNT_CHIPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`chip${amount === c ? " is-active" : ""}`}
                    onClick={() => setAmount(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <p className="field-hint">
                = <strong>{predictionsAvailable} predictions available</strong>{" "}
                · fee per prediction {FEE_PER_PREDICTION} testnet {asset}{" "}
                (read-only).
              </p>
            </div>

            {/* Asset */}
            <div className="field">
              <p className="field-label">
                <Coins aria-hidden />
                Asset
              </p>
              <p className="field-help">Which testnet asset funds the budget.</p>
              <div className="segmented" role="radiogroup" aria-label="Asset">
                <button
                  type="button"
                  className={`seg${asset === "USDC" ? " is-active" : ""}`}
                  role="radio"
                  aria-checked={asset === "USDC"}
                  onClick={() => setAsset("USDC")}
                >
                  <CircleDollarSign aria-hidden />
                  Testnet USDC
                </button>
                <button
                  type="button"
                  className={`seg${asset === "SUI" ? " is-active" : ""}`}
                  role="radio"
                  aria-checked={asset === "SUI"}
                  onClick={() => setAsset("SUI")}
                >
                  <Droplet aria-hidden />
                  SUI
                </button>
              </div>
            </div>

            {/* Purpose */}
            <div className="field">
              <label className="field-label" htmlFor="budget-purpose">
                <BookOpen aria-hidden />
                Purpose
              </label>
              <p className="field-help">What the agent is allowed to buy.</p>
              <div className="select-wrap">
                <select
                  id="budget-purpose"
                  className="field-select"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                >
                  {PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <ChevronDown className="caret" aria-hidden />
              </div>
            </div>

            {/* Expiry */}
            <div className="field">
              <p className="field-label">
                <Clock aria-hidden />
                Expiry
              </p>
              <p className="field-help">The policy auto-revokes after this window.</p>
              <div className="segmented" role="radiogroup" aria-label="Expiry">
                {(["1h", "24h", "7d"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`seg${expiry === opt ? " is-active" : ""}`}
                    role="radio"
                    aria-checked={expiry === opt}
                    onClick={() => setExpiry(opt)}
                  >
                    {opt === "1h" ? "1 hour" : opt === "24h" ? "24 hours" : "7 days"}
                  </button>
                ))}
              </div>
            </div>

            {/* Approval rule */}
            <div className="field">
              <p className="field-label">
                <Lock aria-hidden />
                Approval rule
              </p>
              <p className="field-help">How much autonomy the agent gets.</p>
              <div className="radio-list" role="radiogroup" aria-label="Approval rule">
                <button
                  type="button"
                  className={`radio-card${approval === "final" ? " is-active" : ""}`}
                  role="radio"
                  aria-checked={approval === "final"}
                  onClick={() => setApproval("final")}
                >
                  <span className="radio-dot" aria-hidden />
                  <div>
                    <p className="radio-title">
                      <Lock aria-hidden />
                      Final financial action requires user signature
                    </p>
                    <p className="radio-desc">
                      The agent researches freely, but you sign any market entry
                      yourself. Recommended.
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  className={`radio-card${approval === "research_only" ? " is-active" : ""}`}
                  role="radio"
                  aria-checked={approval === "research_only"}
                  onClick={() => setApproval("research_only")}
                >
                  <span className="radio-dot" aria-hidden />
                  <div>
                    <p className="radio-title">Research-only — no financial actions</p>
                    <p className="radio-desc">
                      The agent can only buy research. It can never place or simulate a
                      position.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </section>

          {/* ---------- Policy summary ---------- */}
          <aside className="summary-card">
            <div className="sum-head">
              <span className="sum-lock" aria-hidden>
                <Lock />
              </span>
              <div>
                <p className="sum-title">Payment policy</p>
                <p className="sum-subtitle">Constraints the agent must obey</p>
              </div>
            </div>

            <div className="sum-body">
              <div className="sum-row">
                <span className="sum-label">
                  <CircleDollarSign aria-hidden />
                  Authorization cap
                </span>
                <span className="sum-value sum-value--big">
                  {amount} testnet {asset}
                </span>
              </div>
              <div className="sum-row">
                <span className="sum-label">
                  <CircleDollarSign aria-hidden />
                  Fee per prediction
                </span>
                <span className="sum-value">
                  {FEE_PER_PREDICTION} testnet {asset} · {predictionsAvailable}{" "}
                  available
                </span>
              </div>
              <div className="sum-row">
                <span className="sum-label">
                  <BookOpen aria-hidden />
                  Purpose
                </span>
                <span className="sum-value">{purpose}</span>
              </div>
              <div className="sum-row">
                <span className="sum-label">
                  <Wallet aria-hidden />
                  Recipient
                </span>
                <span className="sum-value">Testnet merchant</span>
              </div>
              <div className="sum-row">
                <span className="sum-label">
                  <Clock aria-hidden />
                  Expiry
                </span>
                <span className="sum-value">{expiryLabel}</span>
              </div>
              <div className="sum-row">
                <span className="sum-label">
                  <ListChecks aria-hidden />
                  Number of uses
                </span>
                <span className="sum-value">{policy.frequencyLimit}</span>
              </div>
            </div>

            <div className="sum-approval">
              <div className="approval-flag">
                <ShieldCheck aria-hidden />
                <span>
                  {policy.finalActionRequiresUserSignature
                    ? "Final approval required"
                    : "Research-only — no financial actions"}
                </span>
              </div>
            </div>

            <div className="sum-foot">
              <ActionButton
                variant="primary"
                className="btn--lg"
                trailing={<ArrowRight aria-hidden />}
                onAction={onContinue}
                loadingToast={{ title: "Saving budget…" }}
                successToast={{
                  title: "Budget saved",
                  description: `${amount} testnet ${asset} · ${purpose}`,
                }}
                errorToast={{ title: "Couldn't save budget" }}
              >
                Continue to Pay
              </ActionButton>
              <button type="button" className="btn btn--ghost reset" onClick={onReset}>
                Reset to defaults
              </button>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
