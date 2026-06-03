"use client";

import { TrendingUp, ShieldCheck, Wallet, SlidersHorizontal, CreditCard, LineChart, FlaskConical, ClipboardCheck, Check, Info } from "lucide-react";
import type { ReactNode } from "react";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { NetworkBadge } from "@/components/wallet/NetworkBadge";
import { BudgetMeterPill } from "@/components/agent/BudgetMeterPill";
import { BudgetReopenGate } from "@/components/agent/BudgetReopenGate";

/**
 * PredictFlow app shell — ports the Claude Design handoff (predictflow.css)
 * to React. Wrap each page body in <AppShell currentStep={n}>...</AppShell>.
 * Requires predictflow.css imported once in app/layout.tsx.
 */

type StepKey = "connect" | "budget" | "pay" | "explore" | "simulate" | "review";

const STEPS: { key: StepKey; label: string; Icon: typeof Wallet }[] = [
  { key: "connect", label: "Connect", Icon: Wallet },
  { key: "budget", label: "Budget", Icon: SlidersHorizontal },
  { key: "pay", label: "Pay", Icon: CreditCard },
  { key: "explore", label: "Explore", Icon: LineChart },
  { key: "simulate", label: "Simulate", Icon: FlaskConical },
  { key: "review", label: "Review", Icon: ClipboardCheck },
];

export function AppShell({
  currentStep,
  network = "Sui Testnet",
  children,
}: {
  /** 0-based index of the active step in the flow */
  currentStep: number;
  /** Footer network label. Defaults to "Sui Testnet". */
  network?: string;
  children: ReactNode;
}) {
  // Wallet state is read directly by ConnectWalletButton / NetworkBadge from the store.
  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden>
              {/* branching-node mark, matches public/logo.svg */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M5 12 C 11 12, 12 6, 18 6" />
                <path d="M5 12 C 11 12, 12 18, 18 18" />
                <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
                <circle cx="18" cy="6" r="1.4" fill="currentColor" stroke="none" />
                <circle cx="18" cy="18" r="1.4" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span className="brand-name">PredictFlow</span>
          </div>

          <div className="nav-right">
            <span className="demo-badge">
              <Info aria-hidden /> Sui Testnet
            </span>
            <BudgetMeterPill />
            <NetworkBadge />
            <ConnectWalletButton />
            {/* `network` retained for the footer text below */}
            {false && network}
          </div>
        </div>
      </nav>

      <div className="stepper-wrap">
        <div className="stepper" role="list" aria-label="Flow progress">
          {STEPS.map((step, i) => {
            const state = i < currentStep ? "is-done" : i === currentStep ? "is-active" : "";
            const StepIcon = step.Icon;
            return (
              <div key={step.key} style={{ display: "contents" }}>
                <div className={`step ${state}`} role="listitem">
                  <span className="step-node">{i < currentStep ? <Check aria-hidden /> : <StepIcon aria-hidden />}</span>
                  <span className="step-label">{step.label}</span>
                </div>
                {i < STEPS.length - 1 && <span className="step-connector" aria-hidden />}
              </div>
            );
          })}
        </div>
      </div>

      <BudgetReopenGate />

      <main>{children}</main>

      <footer>
        <div className="footer-inner">
          <ShieldCheck aria-hidden />
          Sui {network} · Not financial advice
        </div>
      </footer>
    </>
  );
}

export default AppShell;
