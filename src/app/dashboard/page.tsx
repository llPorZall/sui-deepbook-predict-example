"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { WalletStatusCard } from "@/components/wallet/WalletStatusCard";

export default function DashboardPage() {
  const router = useRouter();
  return (
    <AppShell currentStep={0}>
      <div className="wallet-main">
        <div className="page-head">
          <h1 className="page-title">Wallet connected</h1>
          <p className="page-sub">Review your connection, then start the demo.</p>
        </div>

        <WalletStatusCard onStart={() => router.push("/budget")} />
      </div>
    </AppShell>
  );
}
