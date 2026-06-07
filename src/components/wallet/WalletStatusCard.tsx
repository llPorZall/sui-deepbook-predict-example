"use client";

import {
  ArrowRight,
  BadgeCheck,
  CircleCheckBig,
  CircleX,
  Copy,
  Droplet,
  Globe,
  IdCard,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCurrentAccount,
  useCurrentWallet,
  useDisconnectWallet,
} from "@mysten/dapp-kit";
import { NetworkBadge } from "./NetworkBadge";
import { useDemoStore, DEMO_STEPS } from "@/lib/store/demoStore";
import { useWalletBalances } from "@/lib/sui/useWalletBalances";
import { ActionButton } from "@/components/ui/ActionButton";
import { toast } from "@/lib/toast/toastStore";

function shortAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 10)}…${address.slice(-5)}`;
}

export function WalletStatusCard({ onStart }: { onStart?: () => void }) {
  const router = useRouter();
  const account = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const wallet = useDemoStore((s) => s.wallet);
  const setWallet = useDemoStore((s) => s.setWallet);
  const resetDemo = useDemoStore((s) => s.resetDemo);
  const setCurrentStep = useDemoStore((s) => s.setCurrentStep);
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const { sui, stable, isLoading: balancesLoading } = useWalletBalances();

  const connected = wallet.connected && !!account;
  const address = account?.address ?? "";

  const handleDisconnect = () => {
    disconnectWallet();
    setWallet({ connected: false });
    resetDemo();
    setCurrentStep(DEMO_STEPS.connect);
    router.push("/");
    toast.info("Wallet disconnected");
  };

  return (
    <section className="wallet-card">
      <header className="wc-head">
        <div className="wc-provider">
          <span className="wc-logo" aria-hidden>
            <Droplet />
          </span>
          <div>
            <p className="wc-provider-name">{currentWallet?.name ?? "Slush Wallet"}</p>
            <p className="wc-provider-sub">Sui · Wallet Standard</p>
          </div>
        </div>
        {connected ? (
          <span className="badge badge--success">
            <CircleCheckBig aria-hidden />
            Connected
          </span>
        ) : (
          <span className="badge badge--info">
            <CircleX aria-hidden />
            Not connected
          </span>
        )}
      </header>

      <div className="wc-body">
        <div className="wc-row">
          <span className="wc-label">
            <IdCard aria-hidden />
            Address
          </span>
          <span className="wc-value">
            {connected ? shortAddress(address) : "—"}
            {connected && (
              <button
                type="button"
                className="copy-btn"
                aria-label="Copy address"
                onClick={() => navigator.clipboard?.writeText(address)}
              >
                <Copy aria-hidden />
              </button>
            )}
          </span>
        </div>

        <div className="wc-row">
          <span className="wc-label">
            <Globe aria-hidden />
            Network
          </span>
          <span className="wc-value">
            <NetworkBadge />
          </span>
        </div>

        <div className="wc-row">
          <span className="wc-label">
            <BadgeCheck aria-hidden />
            Status
          </span>
          <span className="wc-value">
            {connected ? "Active session" : "Awaiting connection"}
          </span>
        </div>

        <div className="wc-balance">
          <div className="bal-group">
            <div>
              <p className="bal-label">SUI</p>
              <p
                className={`bal-value${connected && sui.amount !== null ? "" : " bal-placeholder"}`}
              >
                {connected && sui.amount !== null ? sui.amount : "—"}{" "}
                <span className="unit">SUI</span>
              </p>
            </div>
            <div>
              <p className="bal-label">Stablecoin</p>
              <p
                className={`bal-value${connected && stable.amount !== null ? "" : " bal-placeholder"}`}
              >
                {connected && stable.amount !== null ? stable.amount : "—"}{" "}
                <span className="unit">{stable.symbol}</span>
              </p>
            </div>
          </div>
          <span className="bal-note">
            {!connected
              ? "Connect to view balance"
              : balancesLoading
                ? "Loading balance…"
                : "Sui Testnet"}
          </span>
        </div>
      </div>

      <div className="wc-foot">
        {connected ? (
          <>
            <ActionButton
              variant="primary"
              className="btn--lg start-btn"
              trailing={<ArrowRight aria-hidden />}
              onAction={() => onStart?.()}
              loadingToast={{ title: "Launching…" }}
              successToast={{ title: "Budget step opened" }}
              errorToast={{ title: "Couldn't launch" }}
            >
              Launch app
            </ActionButton>
            <button
              type="button"
              className="btn btn--secondary wc-disconnect"
              onClick={handleDisconnect}
            >
              <LogOut aria-hidden />
              Disconnect
            </button>
          </>
        ) : (
          <p className="bal-note">Use the Connect button above to begin.</p>
        )}
      </div>
    </section>
  );
}

export default WalletStatusCard;
