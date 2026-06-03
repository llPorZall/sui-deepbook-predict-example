"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CircleCheckBig,
  CircleDollarSign,
  CreditCard,
  DollarSign,
  FileCheck2,
  FileText,
  Info,
  Lock,
  Receipt as ReceiptIcon,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { AppShell } from "@/components/layout/AppShell";
import { DEMO_STEPS, useDemoStore } from "@/lib/store/demoStore";
import { createPaymentIntent } from "@/lib/payment/createPaymentIntent";
import {
  createReceipt,
  listStoredReceipts,
  persistReceipt,
} from "@/lib/payment/createReceipt";
import {
  buildOnChainPaymentKey,
  findDuplicate,
} from "@/lib/payment/duplicateProtection";
import { getPayKitConfig, isPayKitTestnetEnabled } from "@/lib/payment/payKitConfig";
import { buildResearchPayment } from "@/lib/payment/suiPaymentTx";
import { ActionButton } from "@/components/ui/ActionButton";
import { toast } from "@/lib/toast/toastStore";

function shortAddress(address: string): string {
  if (!address) return "—";
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function shortDigest(digest: string | undefined): string {
  if (!digest) return "—";
  if (digest.length <= 10) return digest;
  return `${digest.slice(0, 4)}…${digest.slice(-3)}`;
}

export default function PaymentPage() {
  const router = useRouter();
  const wallet = useDemoStore((s) => s.wallet);
  const agentPolicy = useDemoStore((s) => s.agentPolicy);
  const paymentIntent = useDemoStore((s) => s.paymentIntent);
  const receipt = useDemoStore((s) => s.receipt);
  const setPaymentIntent = useDemoStore((s) => s.setPaymentIntent);
  const setReceipt = useDemoStore((s) => s.setReceipt);
  const setCurrentStep = useDemoStore((s) => s.setCurrentStep);

  const suiClient = useSuiClient();
  const signAndExecute = useSignAndExecuteTransaction();
  const testnetPaymentsEnabled =
    isPayKitTestnetEnabled() && wallet.network === "sui:testnet";

  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);

  useEffect(() => {
    setCurrentStep(DEMO_STEPS.pay);
  }, [setCurrentStep]);

  // Build a payment intent from the active agent policy whenever it changes.
  useEffect(() => {
    if (!agentPolicy || !wallet.address) return;
    if (
      paymentIntent &&
      paymentIntent.walletAddress === wallet.address &&
      paymentIntent.amount === agentPolicy.spendingCap &&
      paymentIntent.recipient === agentPolicy.allowedRecipient &&
      paymentIntent.purpose === agentPolicy.purpose &&
      paymentIntent.asset === `demo ${agentPolicy.asset}`
    )
      return;
    const intent = createPaymentIntent({
      walletAddress: wallet.address,
      recipient: agentPolicy.allowedRecipient,
      amount: agentPolicy.spendingCap,
      asset: `demo ${agentPolicy.asset}`,
      purpose: agentPolicy.purpose,
      expiryHours: 24,
      gasStrategy: "sponsored",
    });
    setPaymentIntent(intent);
    // Clear any stale receipt tied to the previous intent so the receipt
    // preview doesn't show the old amount.
    if (receipt) setReceipt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentPolicy, wallet.address]);

  const onConfirm = async () => {
    if (!paymentIntent) throw new Error("Payment intent is not ready");
    setDuplicateNotice(null);

    // ---- Testnet (real Sui Payment Kit) branch ----
    if (testnetPaymentsEnabled) {
      const config = getPayKitConfig();
      const built = buildResearchPayment(suiClient, {
        walletAddress: paymentIntent.walletAddress,
        amountDusdc: paymentIntent.amount,
        purpose: paymentIntent.purpose,
      });

      // App-side duplicate key now mirrors the on-chain PaymentKey composite.
      const onChainKey = buildOnChainPaymentKey(built.paymentKeyParts);
      const stored = listStoredReceipts();
      const localMatch = findDuplicate(stored, onChainKey);
      if (localMatch.existing) {
        setReceipt(localMatch.existing);
        setPaymentIntent({ ...paymentIntent, status: "paid", duplicateProtectionKey: onChainKey });
        const notice = `On-chain duplicate protection: a payment with the same nonce was already submitted (${localMatch.existing.receiptId}). Re-using the existing receipt.`;
        setDuplicateNotice(notice);
        toast.info("Duplicate prevented", `Re-using ${localMatch.existing.receiptId}`);
        return localMatch.existing;
      }

      try {
        const result = await signAndExecute.mutateAsync({
          transaction: built.transaction,
          chain: "sui:testnet",
        });

        const rcpt = createReceipt({
          intent: { ...paymentIntent, duplicateProtectionKey: onChainKey },
          status: "paid",
          network: "sui:testnet",
          txDigest: result.digest,
        });
        persistReceipt(rcpt);
        setReceipt(rcpt);
        setPaymentIntent({ ...paymentIntent, status: "paid", duplicateProtectionKey: onChainKey });
        return rcpt;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/EDuplicatePayment|duplicate.payment/i.test(msg)) {
          // Registry mode rejected a repeated nonce → reuse any local receipt.
          const reuse = listStoredReceipts().find(
            (r) => r.duplicateProtectionKey === onChainKey,
          );
          const notice = `This research payment was already made today (on-chain duplicate detected).${
            reuse ? ` Showing receipt ${reuse.receiptId}.` : ""
          }`;
          setDuplicateNotice(notice);
          toast.info("Duplicate prevented", notice);
          if (reuse) {
            setReceipt(reuse);
            setPaymentIntent({ ...paymentIntent, status: "paid", duplicateProtectionKey: onChainKey });
            return reuse;
          }
          // No local record yet, but the chain says it exists. Surface a soft
          // success rather than failing the demo.
          const placeholder = createReceipt({
            intent: { ...paymentIntent, duplicateProtectionKey: onChainKey },
            status: "paid",
            network: "sui:testnet",
          });
          persistReceipt(placeholder);
          setReceipt(placeholder);
          setPaymentIntent({ ...paymentIntent, status: "paid", duplicateProtectionKey: onChainKey });
          return placeholder;
        }
        // Surface unknown chain errors without leaking config.
        void config;
        throw err;
      }
    }

    // ---- Simulated (default) branch ----
    // Simulate the request round-trip so the loading indicator is visible.
    await new Promise((resolve) => setTimeout(resolve, 400));
    const match = findDuplicate(listStoredReceipts(), paymentIntent.duplicateProtectionKey);
    if (match.existing) {
      setReceipt(match.existing);
      setPaymentIntent({ ...paymentIntent, status: "paid" });
      const notice = `A receipt for this purpose already exists today (${match.existing.receiptId}). Showing the existing receipt instead of charging twice.`;
      setDuplicateNotice(notice);
      toast.info("Duplicate prevented", `Re-using ${match.existing.receiptId}`);
      return match.existing;
    }
    const rcpt = createReceipt({
      intent: paymentIntent,
      status: "simulated",
      network: wallet.network ?? "sui:testnet",
    });
    persistReceipt(rcpt);
    setReceipt(rcpt);
    setPaymentIntent({ ...paymentIntent, status: "paid" });
    return rcpt;
  };

  // Display values, falling back to placeholders when nothing is wired up yet.
  const amount = paymentIntent?.amount ?? agentPolicy?.spendingCap ?? "5";
  const asset = paymentIntent?.asset ?? `demo ${agentPolicy?.asset ?? "USDC"}`;
  const purpose = paymentIntent?.purpose ?? agentPolicy?.purpose ?? "Market research";
  const recipient = paymentIntent?.recipient ?? agentPolicy?.allowedRecipient ?? "";
  const recipientShort = recipient ? shortAddress(recipient) : "0x9c12…ab07";

  return (
    <AppShell currentStep={DEMO_STEPS.pay}>
      {/* =================== INTENT PREVIEW =================== */}
      <div className="pay-main">
        <div className="page-head page-head--left">
          <h1 className="page-title">Review payment intent</h1>
          <p className="explainer">
            <Info aria-hidden />
            A payment intent bundles the purpose, amount, recipient, and execution
            rules into one clear flow before you confirm.
          </p>
        </div>

        <div className="pay-grid">
          {/* ---------- Intent card ---------- */}
          <section className="intent-card">
            <header className="ic-head">
              <div className="ic-head-l">
                <span className="ic-badge-icon" aria-hidden>
                  <FileCheck2 />
                </span>
                <div>
                  <p className="ic-title">Payment intent</p>
                  <p className="ic-sub">
                    Not just a transfer — a bundled, rule-bound request
                  </p>
                </div>
              </div>
              <span className="badge badge--info">
                <Info aria-hidden />
                Demo
              </span>
            </header>

            <div className="bundle">
              <p className="bundle-cap">More than a token transfer</p>
              <div className="bundle-flow">
                <div className="bundle-inputs">
                  <span className="b-chip">
                    <BookOpen aria-hidden />
                    Purpose
                  </span>
                  <span className="b-chip">
                    <CircleDollarSign aria-hidden />
                    Amount
                  </span>
                  <span className="b-chip">
                    <Wallet aria-hidden />
                    Recipient
                  </span>
                  <span className="b-chip">
                    <Lock aria-hidden />
                    Rules
                  </span>
                </div>
                <span className="bundle-arrow" aria-hidden>
                  <ArrowRight />
                </span>
                <div className="bundle-out">
                  <FileText aria-hidden />
                  <span>1 Intent</span>
                  <small>Signed once</small>
                </div>
              </div>
            </div>

            <div className="ic-rows">
              <div className="ic-row">
                <span className="ic-label">
                  <CircleDollarSign aria-hidden />
                  Amount
                </span>
                <span className="ic-value ic-value--amount">{amount}</span>
              </div>
              <div className="ic-row">
                <span className="ic-label">
                  <DollarSign aria-hidden />
                  Asset
                </span>
                <span className="ic-value">{asset}</span>
              </div>
              <div className="ic-row">
                <span className="ic-label">
                  <BookOpen aria-hidden />
                  Purpose
                </span>
                <span className="ic-value">{purpose}</span>
              </div>
              <div className="ic-row">
                <span className="ic-label">
                  <Wallet aria-hidden />
                  Recipient
                </span>
                <span className="ic-value">Demo merchant · {recipientShort}</span>
              </div>
              <div className="ic-row">
                <span className="ic-label">
                  <Activity aria-hidden />
                  Gas strategy
                </span>
                <span className="ic-value">
                  <span className="badge badge--success">
                    <CircleCheckBig aria-hidden />
                    {paymentIntent?.gasStrategy ?? "sponsored"}
                  </span>
                </span>
              </div>
            </div>

            <div className="dup-note">
              <ShieldCheck aria-hidden />
              <span>
                <b>Duplicate payment protection.</b> Key{" "}
                <code>{paymentIntent?.duplicateProtectionKey ?? "wallet-purpose-date"}</code>{" "}
                — re-submitting won&apos;t charge twice.
              </span>
            </div>

            {duplicateNotice && (
              <div className="dup-note" role="status">
                <Info aria-hidden />
                <span>{duplicateNotice}</span>
              </div>
            )}

            <div className="ic-foot">
              <ActionButton
                variant="secondary"
                leading={<ArrowLeft aria-hidden />}
                onAction={() => router.push("/budget")}
                loadingToast={false}
                successToast={false}
              >
                Back
              </ActionButton>
              <ActionButton
                variant="primary"
                leading={<CreditCard aria-hidden />}
                disabled={!paymentIntent}
                onAction={async () => {
                  const result = await onConfirm();
                  router.push("/payment/receipt");
                  return result;
                }}
                loadingToast={{ title: "Submitting payment intent…" }}
                successToast={{
                  title: "Payment intent processed",
                  description: "Opening receipt…",
                }}
                errorToast={{ title: "Payment failed" }}
              >
                Pay &amp; Generate Research
              </ActionButton>
            </div>
          </section>

          {/* ---------- Receipt preview (pre-pay placeholder) ---------- */}
          <aside className="receipt-preview">
            <span className="rp-tag">Receipt preview</span>
            <div className="rp-head">
              <ReceiptIcon aria-hidden />
              <p>What you&apos;ll receive</p>
            </div>
            <div className="rp-row">
              <span className="rp-k">Receipt ID</span>
              <span className="rp-v">{receipt?.receiptId ?? "pf_rcpt_••••"}</span>
            </div>
            <div className="rp-row">
              <span className="rp-k">Status</span>
              <span className="rp-v">{receipt?.status ?? "Paid"}</span>
            </div>
            <div className="rp-row">
              <span className="rp-k">Amount</span>
              <span className="rp-v">{amount} {agentPolicy?.asset ?? "USDC"}</span>
            </div>
            <div className="rp-row">
              <span className="rp-k">Purpose</span>
              <span className="rp-v">{purpose}</span>
            </div>
            <div className="rp-divider" />
            <div className="rp-row">
              <span className="rp-k">Tx digest</span>
              <span className="rp-v">{shortDigest(receipt?.txDigest)}</span>
            </div>
            <div className="rp-row">
              <span className="rp-k">Network</span>
              <span className="rp-v">Sui Testnet</span>
            </div>
            <p className="rp-hint">
              <Info aria-hidden />
              A full, verifiable receipt is generated the moment you confirm.
            </p>
          </aside>
        </div>
      </div>

    </AppShell>
  );
}
