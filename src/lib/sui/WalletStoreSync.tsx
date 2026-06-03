"use client";

import { useEffect } from "react";
import { useCurrentAccount, useCurrentWallet } from "@mysten/dapp-kit";
import { useDemoStore } from "@/lib/store/demoStore";
import type { WalletNetwork } from "@/types/wallet";

function chainToNetwork(chain: string | undefined): WalletNetwork {
  if (chain === "sui:testnet") return "sui:testnet";
  if (chain === "sui:mainnet") return "sui:mainnet";
  return "unknown";
}

/**
 * Mirrors dapp-kit's wallet state into the Zustand demo store so screens
 * have a single source of truth.
 */
export function WalletStoreSync() {
  const account = useCurrentAccount();
  const { currentWallet, connectionStatus } = useCurrentWallet();
  const setWallet = useDemoStore((s) => s.setWallet);

  useEffect(() => {
    if (connectionStatus !== "connected" || !account) {
      setWallet({ connected: false });
      return;
    }
    setWallet({
      connected: true,
      address: account.address,
      walletName: currentWallet?.name,
      network: chainToNetwork(account.chains?.[0]),
    });
  }, [account, currentWallet, connectionStatus, setWallet]);

  return null;
}
