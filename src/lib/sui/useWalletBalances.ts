"use client";

import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";

export type CoinBalanceView = {
  symbol: string;
  /** Decimal-formatted amount, e.g. "12.345". `null` when the wallet has no balance for the coin. */
  amount: string | null;
  coinType: string | null;
};

export type WalletBalances = {
  sui: CoinBalanceView;
  stable: CoinBalanceView;
  isLoading: boolean;
  isError: boolean;
};

const SUI_COIN_TYPE = "0x2::sui::SUI";
const STABLE_REGEX = /::d?usdc::/i;

function formatBalance(raw: string, decimals: number): string {
  let big: bigint;
  try {
    big = BigInt(raw);
  } catch {
    return "0";
  }
  const zero = BigInt(0);
  if (big === zero) return "0";
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = big / divisor;
  const frac = big % divisor;
  if (frac === zero) return whole.toLocaleString("en-US");
  const fracStr = frac
    .toString()
    .padStart(decimals, "0")
    .slice(0, 4)
    .replace(/0+$/, "");
  return fracStr
    ? `${whole.toLocaleString("en-US")}.${fracStr}`
    : whole.toLocaleString("en-US");
}

function symbolForStable(coinType: string): string {
  if (/::dusdc::/i.test(coinType)) return "DUSDC";
  return "USDC";
}

export function useWalletBalances(): WalletBalances {
  const account = useCurrentAccount();
  const query = useSuiClientQuery(
    "getAllBalances",
    { owner: account?.address ?? "" },
    { enabled: !!account?.address, refetchInterval: 15_000 },
  );

  const balances = query.data ?? [];
  const suiEntry = balances.find((b) => b.coinType === SUI_COIN_TYPE);
  const stableEntry = balances.find((b) => STABLE_REGEX.test(b.coinType));

  return {
    sui: {
      symbol: "SUI",
      coinType: SUI_COIN_TYPE,
      amount: suiEntry ? formatBalance(suiEntry.totalBalance, 9) : account ? "0" : null,
    },
    stable: {
      symbol: stableEntry ? symbolForStable(stableEntry.coinType) : "USDC",
      coinType: stableEntry?.coinType ?? null,
      amount: stableEntry ? formatBalance(stableEntry.totalBalance, 6) : account ? "0" : null,
    },
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
