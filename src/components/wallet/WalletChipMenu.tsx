"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Copy,
  Droplet,
  ExternalLink,
  Globe,
  IdCard,
  LogOut,
} from "lucide-react";
import {
  useCurrentAccount,
  useCurrentWallet,
  useDisconnectWallet,
} from "@mysten/dapp-kit";
import { DropdownMenu } from "radix-ui";
import { NetworkBadge } from "./NetworkBadge";
import { useDemoStore, DEMO_STEPS } from "@/lib/store/demoStore";
import { useWalletBalances } from "@/lib/sui/useWalletBalances";
import { toast } from "@/lib/toast/toastStore";

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Connected-wallet chip in the top nav. Clicking opens a dropdown with full
 * address (+ copy), network, explorer link, balances, and Disconnect.
 *
 * Uses radix-ui DropdownMenu (behavior-only primitive) styled with
 * predictflow.css tokens — see `.wallet-menu*` rules.
 */
export function WalletChipMenu({ className }: { className?: string }) {
  const router = useRouter();
  const account = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const { sui, stable } = useWalletBalances();

  const setWallet = useDemoStore((s) => s.setWallet);
  const resetDemo = useDemoStore((s) => s.resetDemo);
  const setCurrentStep = useDemoStore((s) => s.setCurrentStep);

  const [copied, setCopied] = useState(false);

  if (!account) return null;
  const address = account.address;
  const explorerUrl = `https://suiscan.xyz/testnet/account/${address}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Couldn't copy address");
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setWallet({ connected: false });
    resetDemo();
    setCurrentStep(DEMO_STEPS.connect);
    router.push("/");
    toast.info("Wallet disconnected");
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={`wallet-chip wallet-chip--button${className ? ` ${className}` : ""}`}
          aria-label="Wallet menu"
        >
          <span className="wallet-dot" aria-hidden />
          <span className="wallet-addr">{shortAddress(address)}</span>
          {currentWallet?.name && (
            <span className="wallet-net">{currentWallet.name}</span>
          )}
          <ChevronDown aria-hidden className="wallet-chip-caret" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="wallet-menu"
          align="end"
          sideOffset={8}
          collisionPadding={12}
        >
          <div className="wallet-menu-section">
            <p className="wallet-menu-label">
              <IdCard aria-hidden /> Address
            </p>
            <div className="wallet-menu-address">
              <span className="wallet-menu-addr-text">{address}</span>
              <button
                type="button"
                className="copy-btn"
                aria-label={copied ? "Address copied" : "Copy address"}
                onClick={handleCopy}
              >
                <Copy aria-hidden />
              </button>
            </div>
          </div>

          <div className="wallet-menu-section">
            <p className="wallet-menu-label">
              <Globe aria-hidden /> Network
            </p>
            <NetworkBadge />
          </div>

          <div className="wallet-menu-section">
            <p className="wallet-menu-label">
              <Droplet aria-hidden /> Balances
            </p>
            <div className="wallet-menu-balances">
              <div className="wallet-menu-bal-row">
                <span className="wallet-menu-bal-sym">{stable.symbol}</span>
                <span className="wallet-menu-bal-amt">
                  {stable.amount ?? "—"}
                </span>
              </div>
              <div className="wallet-menu-bal-row">
                <span className="wallet-menu-bal-sym">SUI</span>
                <span className="wallet-menu-bal-amt">{sui.amount ?? "—"}</span>
              </div>
            </div>
          </div>

          <DropdownMenu.Separator className="wallet-menu-sep" />

          <DropdownMenu.Item asChild>
            <a
              className="wallet-menu-item"
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink aria-hidden />
              View on explorer
            </a>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <button
              type="button"
              className="wallet-menu-item wallet-menu-item--danger"
              onClick={handleDisconnect}
            >
              <LogOut aria-hidden />
              Disconnect
            </button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default WalletChipMenu;
