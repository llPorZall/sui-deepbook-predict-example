"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleX, Loader2, Wallet } from "lucide-react";
import {
  ConnectModal,
  useCurrentAccount,
  useCurrentWallet,
} from "@mysten/dapp-kit";
import { useDemoStore } from "@/lib/store/demoStore";
import { WalletChipMenu } from "./WalletChipMenu";

export type ConnectError =
  | "not_installed"
  | "rejected"
  | "wrong_network"
  | "no_account"
  | "timeout"
  | "unknown";

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Connect button covering the four PRD §17.1 states:
 *   not connected · connecting · connected · error
 * and surfacing the five PRD §9.2 error variants.
 */
export function ConnectWalletButton({
  className,
}: {
  className?: string;
}) {
  const account = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();
  const wallet = useDemoStore((s) => s.wallet);

  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<ConnectError | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // 30s connect-attempt timeout
  useEffect(() => {
    if (connectionStatus === "connecting") {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setError("timeout");
      }, 30_000);
    } else if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [connectionStatus]);

  // After a successful connect, check wrong-network and no-account.
  useEffect(() => {
    if (connectionStatus !== "connected") return;
    if (!account) {
      setError("no_account");
      return;
    }
    const chain = account.chains?.[0];
    if (chain && chain !== "sui:testnet") {
      setError("wrong_network");
      return;
    }
    setError(null);
  }, [connectionStatus, account]);

  const buttonClass = `btn btn--primary connect-btn${className ? ` ${className}` : ""}`;

  const label = useMemo(() => {
    if (error) return "Connection failed";
    if (connectionStatus === "connecting") return "Connecting…";
    if (connectionStatus === "connected" && account) {
      return shortAddress(account.address);
    }
    return "Connect Slush Wallet";
  }, [error, connectionStatus, account]);

  const Icon = useMemo(() => {
    if (error) return CircleX;
    if (connectionStatus === "connecting") return Loader2;
    return Wallet;
  }, [error, connectionStatus]);

  // Connected + healthy: render the chip-as-dropdown trigger.
  if (wallet.connected && !error && account) {
    return <WalletChipMenu className={className} />;
  }

  return (
    <ConnectModal
      open={modalOpen}
      onOpenChange={(open) => {
        setModalOpen(open);
        if (open) setError(null);
      }}
      trigger={
        <button
          type="button"
          className={buttonClass}
          aria-busy={connectionStatus === "connecting"}
          data-error={error ?? undefined}
        >
          <Icon
            aria-hidden
            className={connectionStatus === "connecting" ? "animate-spin" : undefined}
          />
          <span>{label}</span>
        </button>
      }
    />
  );
}

export default ConnectWalletButton;
