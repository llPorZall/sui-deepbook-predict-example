"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CircleCheckBig,
  Code,
  Copy,
  Download,
  ExternalLink,
  Info,
  Receipt as ReceiptIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { DEMO_STEPS, useDemoStore } from "@/lib/store/demoStore";
import { ActionButton } from "@/components/ui/ActionButton";
import { toast } from "@/lib/toast/toastStore";
import {
  copyReceiptJson,
  downloadReceiptJson,
} from "@/lib/payment/createReceipt";

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

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toISOString().replace("T", " ").slice(0, 19) + " UTC";
  } catch {
    return iso;
  }
}

export default function PaymentReceiptPage() {
  const router = useRouter();
  const receipt = useDemoStore((s) => s.receipt);
  const agentPolicy = useDemoStore((s) => s.agentPolicy);
  const wallet = useDemoStore((s) => s.wallet);
  const setCurrentStep = useDemoStore((s) => s.setCurrentStep);

  // The stepper marks Pay as done and Explore as active — same as the screenshot.
  useEffect(() => {
    setCurrentStep(DEMO_STEPS.markets);
  }, [setCurrentStep]);

  // If a user lands here directly without a receipt, bounce them back to /payment.
  useEffect(() => {
    if (!receipt) {
      toast.info("No receipt yet", "Submit the payment intent first.");
      router.replace("/payment");
    }
  }, [receipt, router]);

  if (!receipt) return null;

  const amount = receipt.amount;
  const asset = receipt.asset;
  const purpose = receipt.purpose;

  return (
    <AppShell currentStep={DEMO_STEPS.markets}>
      <div className="receipt-main">
        <div className="success">
          <div className="success-ring" aria-hidden>
            <Check />
          </div>
          <h2 className="success-title">Payment complete</h2>
          <p className="success-sub">Your research brief is being generated.</p>
        </div>

        <div className="mode-wrap">
          <p className="mode-cap">Demo mode</p>
          <div className="mode-toggle" role="tablist" aria-label="Receipt mode">
            <button
              type="button"
              className={receipt.status === "paid" ? "is-active" : ""}
              role="tab"
              aria-selected={receipt.status === "paid"}
              disabled
            >
              Paid
            </button>
            <button
              type="button"
              className={receipt.status === "simulated" ? "is-active" : ""}
              role="tab"
              aria-selected={receipt.status === "simulated"}
              disabled
            >
              Simulated
            </button>
          </div>
        </div>

        <section className="receipt-card">
          <header className="rc-head">
            <div className="rc-head-l">
              <span className="rc-icon" aria-hidden>
                <ReceiptIcon />
              </span>
              <div>
                <p className="rc-title">Payment receipt</p>
                <p className="rc-id">{receipt.receiptId}</p>
              </div>
            </div>
            <span
              className={`badge ${receipt.status === "simulated" ? "badge--info" : "badge--success"}`}
            >
              <CircleCheckBig aria-hidden />
              {receipt.status === "simulated"
                ? "Simulated"
                : receipt.status === "failed"
                  ? "Failed"
                  : "Paid"}
            </span>
          </header>

          <div className="rc-body">
            <div className="rc-row">
              <span className="rc-k">Amount</span>
              <span className="rc-v rc-v--amount">
                {amount} <span className="rc-v-unit">{agentPolicy?.asset ?? "USDC"}</span>
              </span>
            </div>
            <div className="rc-row">
              <span className="rc-k">Asset</span>
              <span className="rc-v">{asset}</span>
            </div>
            <div className="rc-row">
              <span className="rc-k">Purpose</span>
              <span className="rc-v">{purpose}</span>
            </div>
            <div className="rc-row">
              <span className="rc-k">Wallet</span>
              <span className="rc-v">
                {shortAddress(receipt.walletAddress || wallet.address || "")}
                <button
                  type="button"
                  className="copy-mini"
                  aria-label="Copy wallet"
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      receipt.walletAddress || wallet.address || "",
                    );
                    toast.success("Wallet copied");
                  }}
                >
                  <Copy aria-hidden />
                </button>
              </span>
            </div>
            <div className="rc-row">
              <span className="rc-k">Timestamp</span>
              <span className="rc-v">{formatTimestamp(receipt.timestamp)}</span>
            </div>
            <div className="rc-row">
              <span className="rc-k">Tx digest</span>
              <span className="rc-v">
                {shortDigest(receipt.txDigest)}
                <a
                  className="explorer-link"
                  href={
                    receipt.txDigest
                      ? `https://suiscan.xyz/testnet/tx/${receipt.txDigest}`
                      : "#"
                  }
                  target={receipt.txDigest ? "_blank" : undefined}
                  rel={receipt.txDigest ? "noopener noreferrer" : undefined}
                  aria-disabled={!receipt.txDigest}
                >
                  <ExternalLink aria-hidden />
                  Explorer
                </a>
              </span>
            </div>
            <div className="rc-row">
              <span className="rc-k">Network</span>
              <span className="rc-v">
                <span className="badge badge--success">
                  <CircleCheckBig aria-hidden />
                  Sui Testnet
                </span>
              </span>
            </div>
          </div>

          <div className="rc-actions">
            <ActionButton
              variant="ghost"
              className="ghost-action"
              leading={<Code aria-hidden />}
              onAction={async () => {
                await copyReceiptJson(receipt);
              }}
              loadingToast={false}
              successToast={{ title: "Receipt JSON copied" }}
              errorToast={{ title: "Couldn't copy receipt" }}
            >
              Copy JSON
            </ActionButton>
            <ActionButton
              variant="ghost"
              className="ghost-action"
              leading={<Download aria-hidden />}
              onAction={() => downloadReceiptJson(receipt)}
              loadingToast={false}
              successToast={{
                title: "Receipt exported",
                description: `${receipt.receiptId}.json`,
              }}
              errorToast={{ title: "Export failed" }}
            >
              Export
            </ActionButton>
          </div>

          <div className="rc-foot">
            <ActionButton
              variant="primary"
              className="btn--lg"
              trailing={<ArrowRight aria-hidden />}
              onAction={() => router.push("/markets")}
              loadingToast={{ title: "Loading markets…" }}
              successToast={{ title: "Markets opened" }}
              errorToast={{ title: "Couldn't open markets" }}
            >
              Continue to Market Dashboard
            </ActionButton>
          </div>
        </section>

        <p className="bal-note" style={{ marginTop: 12, textAlign: "center" }}>
          <Info aria-hidden style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Receipt saved to local storage (non-sensitive only).
        </p>
      </div>
    </AppShell>
  );
}
