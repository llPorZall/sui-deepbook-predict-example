"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import "@mysten/dapp-kit/dist/index.css";
import { WalletStoreSync } from "./WalletStoreSync";
import { Toaster } from "@/components/ui/Toaster";

const NETWORKS = {
  testnet: { url: getJsonRpcFullnodeUrl("testnet"), network: "testnet" as const },
  mainnet: { url: getJsonRpcFullnodeUrl("mainnet"), network: "mainnet" as const },
};

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={NETWORKS} defaultNetwork="testnet">
        <WalletProvider
          autoConnect
          slushWallet={{ name: "PredictFlow Demo" }}
        >
          <WalletStoreSync />
          {children}
          <Toaster />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
