"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Check,
  CircleCheckBig,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  FlaskConical,
  Info,
  Lock,
  Receipt,
  RefreshCcw,
  ShieldCheck,
  TriangleAlert,
  Wifi,
  Zap,
} from "lucide-react";
import {
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { AppShell } from "@/components/layout/AppShell";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  DEMO_STEPS,
  useDemoStore,
  useSelectedMarket,
  type PreviewedPosition,
} from "@/lib/store/demoStore";
import { useWalletBalances } from "@/lib/sui/useWalletBalances";
import { placePredictionTx, DUSDC_UNIT } from "@/lib/sui/predictTx";
import { resolveManagerId } from "@/lib/sui/predictManagerResolver";
import { toStrikeNative } from "@/lib/predict/testnetPricer";
import { toast } from "@/lib/toast/toastStore";
import { useBudgetMeter } from "@/lib/budget/useBudgetMeter";
import { isPredictionPaid } from "@/lib/budget/onchainBudget";

const DATA_MODE = process.env.NEXT_PUBLIC_DATA_MODE;

type ReviewMode = "preview" | "live";

function shortDigest(digest: string | undefined | null): string {
  if (!digest) return "—";
  if (digest.length <= 14) return digest;
  return `${digest.slice(0, 8)}…${digest.slice(-6)}`;
}

function parseAmount(raw: string | null | undefined): number {
  if (!raw) return 0;
  const n = Number.parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function positionMeta(p: PreviewedPosition, symbol: string): string {
  if (p.kind === "binary") {
    return `Binary · ${symbol} ${p.direction} $${p.strike} · ${p.quantity} contracts`;
  }
  return `Range · ${symbol} $${p.lowerStrike}–$${p.higherStrike} · ${p.quantity} contracts`;
}

export default function ReviewPage() {
  const wallet = useDemoStore((s) => s.wallet);
  const receipt = useDemoStore((s) => s.receipt);
  const policy = useDemoStore((s) => s.agentPolicy);
  const simulationResult = useDemoStore((s) => s.simulationResult);
  const previewedPosition = useDemoStore((s) => s.previewedPosition);
  const placedPosition = useDemoStore((s) => s.placedPosition);
  const setPlacedPosition = useDemoStore((s) => s.setPlacedPosition);
  const setCurrentStep = useDemoStore((s) => s.setCurrentStep);
  const market = useSelectedMarket();
  const balances = useWalletBalances();
  const signAndExecute = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const budget = useBudgetMeter();

  // Per-prediction "already paid" check — drives the "free" badge below.
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!policy || !wallet.address || !previewedPosition) {
      setAlreadyPaid(false);
      return;
    }
    void (async () => {
      try {
        const paid = await isPredictionPaid(suiClient, {
          walletAddress: wallet.address!,
          budgetId: policy.budgetId,
          marketId: previewedPosition.oracleId,
          feePerPrediction: policy.feePerPrediction,
        });
        if (!cancelled) setAlreadyPaid(paid);
      } catch {
        if (!cancelled) setAlreadyPaid(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [policy, wallet.address, previewedPosition, suiClient]);

  useEffect(() => {
    setCurrentStep(DEMO_STEPS.review);
  }, [setCurrentStep]);

  const [mode, setMode] = useState<ReviewMode>("preview");

  // --- Live-action gates ---
  const isTestnetMode = DATA_MODE === "testnet";
  const walletOnTestnet = wallet.connected && wallet.network === "sui:testnet";
  const dusdcBalance = parseAmount(balances.stable.amount);
  const requiredDusdc = Math.max(
    simulationResult?.estimatedCost ?? 0,
    previewedPosition?.quantity ?? 0,
    0.000001,
  );
  const hasDusdcBalance = dusdcBalance >= requiredDusdc;
  const suiBalance = parseAmount(balances.sui.amount);
  const hasGas = suiBalance > 0;
  const hasPosition = previewedPosition !== null && previewedPosition.quantity > 0;

  // Oracle gate: on-chain `assert_live_oracle` aborts the mint if the oracle
  // is past expiry or no longer Active. Mirror that check client-side so the
  // user doesn't spend gas on a tx that's guaranteed to abort.
  const ORACLE_EXPIRY_BUFFER_MS = 60_000;
  const oracleLive =
    market?.oracleStatus === "Active" &&
    (previewedPosition?.expiryMs ?? 0) > Date.now() + ORACLE_EXPIRY_BUFFER_MS;

  const liveEnabled =
    isTestnetMode &&
    walletOnTestnet &&
    hasDusdcBalance &&
    hasGas &&
    hasPosition &&
    oracleLive;

  // If the user had picked "live" and conditions regressed, snap back to preview.
  useEffect(() => {
    if (!liveEnabled && mode === "live") setMode("preview");
  }, [liveEnabled, mode]);

  const missingReasons = useMemo(() => {
    const reasons: string[] = [];
    if (!isTestnetMode) {
      reasons.push('Switch NEXT_PUBLIC_DATA_MODE to "testnet".');
    }
    if (!wallet.connected) {
      reasons.push("Connect a Sui wallet (e.g. Slush).");
    } else if (!walletOnTestnet) {
      reasons.push("Switch the connected wallet to Sui Testnet.");
    }
    if (wallet.connected && walletOnTestnet) {
      if (!hasDusdcBalance) {
        reasons.push(
          `Fund the wallet with at least ${requiredDusdc.toFixed(2)} DUSDC for the position.`,
        );
      }
      if (!hasGas) reasons.push("Fund the wallet with testnet SUI for gas.");
    }
    if (!hasPosition) {
      reasons.push("Preview a position on the simulator first.");
    }
    if (hasPosition && !oracleLive) {
      reasons.push(
        "Selected market's oracle is no longer live on testnet (expired or settled) — pick a different market.",
      );
    }
    return reasons;
  }, [
    isTestnetMode,
    wallet.connected,
    walletOnTestnet,
    hasDusdcBalance,
    requiredDusdc,
    hasGas,
    hasPosition,
    oracleLive,
  ]);

  // --- Real receipt / market / position display values ---
  const paymentDone = receipt !== null;
  const paymentMeta = paymentDone
    ? `${receipt.amount} ${receipt.asset} · ${receipt.status === "paid" ? "on-chain" : "simulated"}`
    : "Awaiting payment";
  const paymentBadgeLabel = paymentDone
    ? receipt.status === "paid"
      ? "Paid"
      : "Simulated"
    : "Pending";

  const receiptId = receipt?.receiptId ?? "—";
  const marketMeta = market
    ? `${market.asset} · ${market.oracleIdShort} · Oracle ${market.oracleStatus}`
    : "No market selected";
  const positionMetaLine = previewedPosition && market
    ? positionMeta(previewedPosition, market.symbol)
    : "No position previewed";

  // --- Live action ---
  const onSignAndExecute = async (): Promise<void> => {
    if (!liveEnabled) {
      throw new Error("Live action prerequisites not satisfied");
    }
    if (!previewedPosition) {
      throw new Error("Preview a position first");
    }
    if (!wallet.address) {
      throw new Error("Wallet address unavailable");
    }

    // Resolve (or auto-create) this wallet's PredictManager. First call may
    // trigger a one-time `create_manager` signature; subsequent calls reuse
    // the cached id and only ask for the mint signature.
    const { managerId, created } = await resolveManagerId({
      address: wallet.address,
      suiClient,
      signAndExecute: ({ transaction, chain }) =>
        signAndExecute.mutateAsync({
          transaction: transaction as Parameters<
            typeof signAndExecute.mutateAsync
          >[0]["transaction"],
          chain,
        }),
    });
    if (created) {
      toast.info(
        "PredictManager ready",
        "Next signature places your position.",
      );
    }

    if (!policy) {
      throw new Error("Budget policy not set — return to the Budget step");
    }
    if (budget.expired) {
      throw new Error("Research budget expired — set a new one");
    }
    if (budget.exhausted && !alreadyPaid) {
      throw new Error("Research budget exhausted — set a new one");
    }

    const expiryMs = BigInt(Math.max(0, Math.floor(previewedPosition.expiryMs)));
    const quantity = BigInt(Math.max(0, Math.floor(previewedPosition.quantity)));
    const feeBaseUnits = BigInt(
      Math.max(1, Math.round(Number(policy.feePerPrediction))),
    ) * DUSDC_UNIT;

    const common = {
      fee: {
        amountBaseUnits: feeBaseUnits,
        walletAddress: wallet.address,
        budgetId: policy.budgetId,
        marketId: previewedPosition.oracleId,
      },
      skipFee: alreadyPaid,
      managerId,
      oracleId: previewedPosition.oracleId,
      expiry: expiryMs,
      quantity,
    };

    const built = previewedPosition.kind === "binary"
      ? placePredictionTx(
          {
            kind: "binary",
            ...common,
            strike: toStrikeNative(previewedPosition.strike),
            direction:
              previewedPosition.direction === "above" ? "up" : "down",
          },
          suiClient,
        )
      : placePredictionTx(
          {
            kind: "range",
            ...common,
            lowerStrike: toStrikeNative(previewedPosition.lowerStrike),
            higherStrike: toStrikeNative(previewedPosition.higherStrike),
          },
          suiClient,
        );

    const result = await signAndExecute.mutateAsync({
      transaction: built.transaction,
      chain: "sui:testnet",
    });

    setPlacedPosition({
      txDigest: result.digest,
      network: "sui:testnet",
      placedAt: new Date().toISOString(),
    });

    // Mirror the spend into the budget meter so the pill updates immediately.
    if (built.feeIncluded) {
      budget.markPaid(previewedPosition.oracleId);
    }
  };

  const onPreviewTx = () => {
    toast.info(
      "Preview only",
      "Nothing is signed or submitted in preview mode.",
    );
  };

  const suiscanUrl = placedPosition
    ? `https://suiscan.xyz/testnet/tx/${placedPosition.txDigest}`
    : null;

  return (
    <AppShell currentStep={DEMO_STEPS.review}>
      <div className="review-main">
        <header className="review-head">
          <div className="head-ring" aria-hidden>
            <Check />
          </div>
          <h1>Final review</h1>
          <p>Every step of the flow is complete.</p>
        </header>

        {/* ---------- Checklist (real data) ---------- */}
        <section className="checklist" aria-label="Completed steps">
          <div className="check-row">
            <span className="check-ico" aria-hidden>
              <Check />
            </span>
            <div className="check-body">
              <p className="check-title">Research payment completed</p>
              <p className="check-meta">{paymentMeta}</p>
            </div>
            <span
              className={`check-badge badge ${paymentDone ? "badge--success" : "badge--warning"}`}
            >
              <CircleCheckBig aria-hidden />
              {paymentBadgeLabel}
            </span>
          </div>

          <div className="check-row">
            <span className="check-ico" aria-hidden>
              <Check />
            </span>
            <div className="check-body">
              <p className="check-title">Receipt generated</p>
              <p className="check-meta">{receiptId}</p>
            </div>
            <span className="check-badge badge badge--info">
              <Receipt aria-hidden />
              {receipt?.txDigest ? "On-chain" : "Saved"}
            </span>
          </div>

          <div className="check-row">
            <span className="check-ico" aria-hidden>
              <Check />
            </span>
            <div className="check-body">
              <p className="check-title">Market reviewed</p>
              <p className="check-meta">{marketMeta}</p>
            </div>
            <span
              className={`check-badge badge ${market?.oracleStatus === "Active" ? "badge--success" : "badge--warning"}`}
            >
              <Wifi aria-hidden />
              {market?.oracleStatus === "Active" ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="check-row">
            <span className="check-ico" aria-hidden>
              <Check />
            </span>
            <div className="check-body">
              <p className="check-title">Simulation completed</p>
              <p className="check-meta">{positionMetaLine}</p>
            </div>
            <span className="check-badge badge badge--info">
              <FlaskConical aria-hidden />
              Simulated
            </span>
          </div>

          <div className="reminder-row">
            <span className="reminder-lock" aria-hidden>
              <Lock />
            </span>
            <div>
              <p className="rt">Final action requires your signature</p>
              <p className="rs">
                No position is placed until you explicitly approve it.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Assistant scope message ---------- */}
        <div className="assist-msg">
          <Bot aria-hidden />
          <span>
            The AI assistant can prepare research and simulation, but you must
            explicitly approve any final financial action.
          </span>
        </div>

        {/* ---------- Safe-default mode selector ---------- */}
        <div className="mode-card" role="radiogroup" aria-label="Action mode">
          <button
            type="button"
            className={`mode-opt ${mode === "preview" ? "mode-opt--safe" : ""}`}
            role="radio"
            aria-checked={mode === "preview"}
            onClick={() => setMode("preview")}
          >
            <span className="mo-ico" aria-hidden>
              <ShieldCheck />
            </span>
            <div>
              <p className="mo-title">
                Preview only{" "}
                <span className="mini-pill mini-pill--on">Default</span>
              </p>
              <p className="mo-sub">Safe · no funds move</p>
            </div>
          </button>

          <button
            type="button"
            className={`mode-opt ${
              !liveEnabled
                ? "mode-opt--locked"
                : mode === "live"
                  ? "mode-opt--live"
                  : ""
            }`}
            role="radio"
            aria-checked={mode === "live"}
            disabled={!liveEnabled}
            onClick={() => liveEnabled && setMode("live")}
          >
            <span className="mo-ico" aria-hidden>
              {liveEnabled ? <Zap /> : <Lock />}
            </span>
            <div>
              <p className="mo-title">
                Live action{" "}
                <span
                  className={`mini-pill ${liveEnabled ? "mini-pill--info" : "mini-pill--off"}`}
                >
                  {liveEnabled ? "Ready" : "Locked"}
                </span>
              </p>
              <p className="mo-sub">
                {liveEnabled
                  ? "Real testnet · requires your signature"
                  : "Requires your signature"}
              </p>
            </div>
          </button>
        </div>

        {/* ---------- Missing requirements (when locked) ---------- */}
        {!liveEnabled && missingReasons.length > 0 && (
          <div className="live-gates" role="status">
            <p className="live-gates-title">
              <TriangleAlert aria-hidden />
              To unlock Live action
            </p>
            <ul className="live-gate-list">
              {missingReasons.map((reason) => (
                <li key={reason} className="live-gate-row">
                  <Lock aria-hidden />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ---------- Placed position card ---------- */}
        {placedPosition && (
          <div className="placed-card" role="status">
            <p className="placed-head">
              <CircleCheckBig aria-hidden />
              Position placed on Sui Testnet
            </p>
            <div className="placed-row">
              <span className="placed-k">Tx digest</span>
              <span className="placed-v">{shortDigest(placedPosition.txDigest)}</span>
            </div>
            <div className="placed-row">
              <span className="placed-k">Network</span>
              <span className="placed-v">Sui Testnet</span>
            </div>
            {suiscanUrl && (
              <div className="placed-row">
                <span className="placed-k">Explorer</span>
                <a
                  className="placed-link"
                  href={suiscanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Suiscan
                  <ExternalLink aria-hidden />
                </a>
              </div>
            )}
          </div>
        )}

        {/* ---------- Budget cost / state line ---------- */}
        {budget.active && previewedPosition && !placedPosition && (
          <div
            className={`budget-cost-line${alreadyPaid ? " budget-cost-line--free" : ""}`}
            role="status"
          >
            {alreadyPaid ? (
              <>
                <CircleCheckBig aria-hidden />
                <span>
                  Already placed on this market · no charge
                </span>
              </>
            ) : (
              <>
                <CreditCard aria-hidden />
                <span>
                  This prediction uses {budget.feePerPrediction} testnet USDC of
                  your budget (${budget.remaining} →{" "}
                  ${(
                    Math.max(
                      0,
                      Number(budget.remaining) - Number(budget.feePerPrediction),
                    )
                  ).toString()}
                  )
                </span>
              </>
            )}
          </div>
        )}

        {budget.active && budget.expired && (
          <div className="budget-banner budget-banner--error" role="alert">
            <TriangleAlert aria-hidden />
            <div>
              <p className="budget-banner-title">Budget expired</p>
              <p className="budget-banner-body">
                Return to the Budget step and authorize a new research budget
                before placing more predictions.
              </p>
            </div>
          </div>
        )}

        {budget.active && !budget.expired && budget.exhausted && (
          <div className="budget-banner budget-banner--warn" role="alert">
            <TriangleAlert aria-hidden />
            <div>
              <p className="budget-banner-title">Budget used up</p>
              <p className="budget-banner-body">
                You&apos;ve placed {budget.predictionsCap} predictions under
                this cap. Set a new budget to continue.
              </p>
            </div>
          </div>
        )}

        {budget.active &&
          !budget.expired &&
          !budget.exhausted &&
          budget.status === "rpcError" && (
            <div className="budget-banner budget-banner--warn" role="status">
              <TriangleAlert aria-hidden />
              <div>
                <p className="budget-banner-title">
                  Couldn&apos;t verify on-chain
                </p>
                <p className="budget-banner-body">
                  Showing cached budget figures. Live RPC will retry; the
                  next signature still enforces the on-chain duplicate
                  check, so a paid prediction is never re-charged.
                </p>
              </div>
            </div>
          )}

        {/* ---------- CTAs ---------- */}
        <div className="cta-stack">
          {mode === "live" && liveEnabled ? (
            <>
              <ActionButton
                variant="primary"
                className="btn--lg primary-cta"
                leading={<Zap aria-hidden />}
                disabled={
                  placedPosition !== null ||
                  budget.expired ||
                  (budget.exhausted && !alreadyPaid)
                }
                onAction={onSignAndExecute}
                loadingToast={{
                  title: "Awaiting signature…",
                  description: "Approve the mint in your wallet.",
                }}
                successToast={{
                  title: "Position placed on testnet",
                  description: "View the digest below.",
                }}
                errorToast={{ title: "Sign & execute failed" }}
              >
                {placedPosition ? "Position placed" : "Sign & Execute on Testnet"}
              </ActionButton>
              <p className="primary-helper">
                <Info aria-hidden />
                You will be asked to sign — recipient, amount, and oracle are
                shown above.
              </p>
            </>
          ) : (
            <>
              <ActionButton
                variant="primary"
                className="btn--lg primary-cta"
                leading={<Eye aria-hidden />}
                onAction={onPreviewTx}
                loadingToast={false}
                successToast={false}
                errorToast={false}
              >
                Preview transaction
              </ActionButton>
              <p className="primary-helper">
                <ShieldCheck aria-hidden />
                Preview only — nothing is signed or submitted
              </p>
            </>
          )}

          <div className="cta-secondary-row">
            <button type="button" className="btn btn--secondary">
              <Download aria-hidden />
              Export receipt
            </button>
            <a className="btn btn--ghost btn--ghost-bordered" href="/">
              <RefreshCcw aria-hidden />
              Restart flow
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
