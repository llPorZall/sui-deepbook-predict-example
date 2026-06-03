"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Compass, CreditCard, Lock, TrendingUp, TriangleAlert, Zap } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { ActionButton } from "@/components/ui/ActionButton";
import { useDemoStore } from "@/lib/store/demoStore";

export default function HomePage() {
  const router = useRouter();
  const connected = useDemoStore((s) => s.wallet.connected);

  return (
    <AppShell currentStep={0}>
      <section className="hero">
        <div className="hero-mark" aria-hidden>
          <TrendingUp />
        </div>
        <h1 className="hero-title">PredictFlow</h1>
        <p className="hero-sub">
          A bounded-AI prediction market on Sui Testnet — powered by Sui Payment,
          DeepBook Predict, and an AI research agent.
        </p>

        <div className="cta-area">
          <ConnectWalletButton className="btn--lg" />
          {connected && (
            <ActionButton
              variant="primary"
              className="btn--lg"
              trailing={<ArrowRight aria-hidden />}
              onAction={() => router.push("/dashboard")}
              loadingToast={{ title: "Opening dashboard…" }}
              successToast={{ title: "Welcome to PredictFlow" }}
              errorToast={{ title: "Couldn't open dashboard" }}
            >
              Launch app
            </ActionButton>
          )}
          <span className="wallet-hint">
            <Lock aria-hidden />
            No real funds — testnet keys only
          </span>
        </div>
      </section>

      <section className="features">
        <article className="feature">
          <div className="feature-icon">
            <CreditCard aria-hidden />
          </div>
          <p className="feature-step">Step 03 · Pay</p>
          <h3 className="feature-title">Pay for research</h3>
          <p className="feature-copy">
            Spend a small testnet budget to unlock an AI research brief on a market.
          </p>
        </article>

        <article className="feature">
          <div className="feature-icon">
            <Compass aria-hidden />
          </div>
          <p className="feature-step">Step 04 · Explore</p>
          <h3 className="feature-title">Explore Predict markets</h3>
          <p className="feature-copy">
            Browse open DeepBook Predict markets and see how odds are framed.
          </p>
        </article>

        <article className="feature">
          <div className="feature-icon">
            <Zap aria-hidden />
          </div>
          <p className="feature-step">Step 05 · Simulate</p>
          <h3 className="feature-title">Simulate outcomes</h3>
          <p className="feature-copy">
            Run a bounded agent to model what each outcome could mean — no real stakes.
          </p>
        </article>
      </section>

      <div className="disclaimer">
        <TriangleAlert aria-hidden />
        Runs on Sui Testnet with simulated data. Not financial advice.
      </div>
    </AppShell>
  );
}
