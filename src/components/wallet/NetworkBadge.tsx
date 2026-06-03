"use client";

import { CircleCheckBig, CircleSlash, TriangleAlert, Wifi } from "lucide-react";
import { useDemoStore } from "@/lib/store/demoStore";
import type { WalletNetwork } from "@/types/wallet";

export type NetworkBadgeVariant = "testnet" | "mainnet" | "unknown" | "disconnected";

function variantFor(connected: boolean, network: WalletNetwork | undefined): NetworkBadgeVariant {
  if (!connected) return "disconnected";
  if (network === "sui:testnet") return "testnet";
  if (network === "sui:mainnet") return "mainnet";
  return "unknown";
}

export function NetworkBadge({
  variant: variantProp,
  className,
}: {
  variant?: NetworkBadgeVariant;
  className?: string;
}) {
  const wallet = useDemoStore((s) => s.wallet);
  const variant = variantProp ?? variantFor(wallet.connected, wallet.network);

  if (variant === "testnet") {
    return (
      <span className={`badge badge--success${className ? ` ${className}` : ""}`}>
        <CircleCheckBig aria-hidden />
        Sui Testnet
      </span>
    );
  }
  if (variant === "mainnet") {
    return (
      <span className={`badge badge--warning${className ? ` ${className}` : ""}`}>
        <TriangleAlert aria-hidden />
        Sui Mainnet
      </span>
    );
  }
  if (variant === "unknown") {
    return (
      <span className={`badge badge--error${className ? ` ${className}` : ""}`}>
        <TriangleAlert aria-hidden />
        Unknown network
      </span>
    );
  }
  return (
    <span className={`badge badge--info${className ? ` ${className}` : ""}`}>
      <CircleSlash aria-hidden />
      Not connected
    </span>
  );
}

export default NetworkBadge;
