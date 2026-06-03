import { useMemo } from "react";
import { create } from "zustand";
import type { AgentPolicy } from "@/types/agent";
import type { PaymentIntent, Receipt } from "@/types/payment";
import type {
  DataSource,
  MarketType,
  OracleStatus,
  PredictMarket,
} from "@/types/predict";
import type { WalletState } from "@/types/wallet";
import type { SimulationResult } from "@/lib/predict/simulator";

export type DemoStep = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Mint-ready parameters captured when the user previews a position on the
 * Simulate screen. Carries the structured values (oracle id, expiry ms, strike
 * grid in decimal-USD) the Review screen needs to build a real on-chain mint
 * via `mintBinaryTx` / `mintRangeTx`.
 */
export type PreviewedPosition =
  | {
      kind: "binary";
      oracleId: string;
      expiryMs: number;
      strike: number;
      direction: "above" | "below";
      /** Position size in whole contracts (u64). */
      quantity: number;
    }
  | {
      kind: "range";
      oracleId: string;
      expiryMs: number;
      lowerStrike: number;
      higherStrike: number;
      quantity: number;
    };

export type PlacedPosition = {
  txDigest: string;
  network: "sui:testnet";
  placedAt: string;
};

export const DEMO_STEPS = {
  connect: 0,
  budget: 1,
  pay: 2,
  markets: 3,
  simulate: 4,
  review: 5,
} as const satisfies Record<string, DemoStep>;

const INITIAL_WALLET: WalletState = { connected: false };

export type BudgetMeterStatus =
  | "idle"
  | "loading"
  | "ready"
  | "rpcError";

export type BudgetMeter = {
  status: BudgetMeterStatus;
  /** Decimal-USD strings — kept as strings to match AgentPolicy. */
  remaining: string;
  spent: string;
  /** True when the meter is showing cached values instead of fresh on-chain data. */
  usedCacheFallback: boolean;
};

export type DemoState = {
  wallet: WalletState;
  agentPolicy: AgentPolicy | null;
  paymentIntent: PaymentIntent | null;
  receipt: Receipt | null;
  selectedMarket: PredictMarket | null;
  simulationResult: SimulationResult | null;
  previewedPosition: PreviewedPosition | null;
  placedPosition: PlacedPosition | null;
  currentStep: DemoStep;

  // Phase 4.9
  /** marketIds paid under the current budget (mirrors on-chain). */
  paidMarkets: string[];
  budgetMeter: BudgetMeter;

  setWallet: (wallet: WalletState) => void;
  setAgentPolicy: (policy: AgentPolicy | null) => void;
  setPaymentIntent: (intent: PaymentIntent | null) => void;
  setReceipt: (receipt: Receipt | null) => void;
  setSelectedMarket: (market: PredictMarket | null) => void;
  setSimulationResult: (result: SimulationResult | null) => void;
  setPreviewedPosition: (position: PreviewedPosition | null) => void;
  setPlacedPosition: (position: PlacedPosition | null) => void;
  setCurrentStep: (step: DemoStep) => void;

  setPaidMarkets: (markets: string[]) => void;
  addPaidMarket: (marketId: string) => void;
  setBudgetMeter: (meter: Partial<BudgetMeter>) => void;

  /** Clears demo progress but preserves the wallet connection. */
  resetDemo: () => void;
};

const INITIAL_METER: BudgetMeter = {
  status: "idle",
  remaining: "0",
  spent: "0",
  usedCacheFallback: false,
};

export const useDemoStore = create<DemoState>((set) => ({
  wallet: INITIAL_WALLET,
  agentPolicy: null,
  paymentIntent: null,
  receipt: null,
  selectedMarket: null,
  simulationResult: null,
  previewedPosition: null,
  placedPosition: null,
  currentStep: DEMO_STEPS.connect,
  paidMarkets: [],
  budgetMeter: INITIAL_METER,

  setWallet: (wallet) => set({ wallet }),
  setAgentPolicy: (agentPolicy) => set({ agentPolicy }),
  setPaymentIntent: (paymentIntent) => set({ paymentIntent }),
  setReceipt: (receipt) => set({ receipt }),
  setSelectedMarket: (selectedMarket) => set({ selectedMarket }),
  setSimulationResult: (simulationResult) => set({ simulationResult }),
  setPreviewedPosition: (previewedPosition) => set({ previewedPosition }),
  setPlacedPosition: (placedPosition) => set({ placedPosition }),
  setCurrentStep: (currentStep) => set({ currentStep }),

  setPaidMarkets: (paidMarkets) =>
    set({ paidMarkets: Array.from(new Set(paidMarkets)) }),
  addPaidMarket: (marketId) =>
    set((state) => ({
      paidMarkets: state.paidMarkets.includes(marketId)
        ? state.paidMarkets
        : [...state.paidMarkets, marketId],
    })),
  setBudgetMeter: (patch) =>
    set((state) => ({ budgetMeter: { ...state.budgetMeter, ...patch } })),

  resetDemo: () =>
    set((state) => ({
      agentPolicy: null,
      paymentIntent: null,
      receipt: null,
      selectedMarket: null,
      simulationResult: null,
      previewedPosition: null,
      placedPosition: null,
      paidMarkets: [],
      budgetMeter: INITIAL_METER,
      currentStep: state.wallet.connected ? DEMO_STEPS.budget : DEMO_STEPS.connect,
    })),
}));

/** Shape of the currently-selected market as consumed by downstream UI. */
export type SelectedMarketView = {
  /** Display pair, e.g. "BTC/USD". */
  asset: string;
  /** Base symbol, e.g. "BTC". */
  symbol: string;
  /** Raw market / oracle object id from the Predict server. */
  oracleId: string;
  /** Short form for headers, e.g. "0x1234…ef89". */
  oracleIdShort: string;
  /** Quote asset symbol, e.g. "USDC". */
  quoteAsset: string;
  /** Market expiry (ISO string from the source). */
  expiry: string;
  /** Market expiry as epoch ms — NaN when the source has no expiry. */
  expiryMs: number;
  /** Latest oracle spot price (decimal units). */
  oraclePrice: number;
  /** Smallest tradable strike. Strikes ladder = minStrike + n * tickSize. */
  minStrike: number;
  /** Strike grid step (decimal units). */
  tickSize: number;
  oracleStatus: OracleStatus;
  dataSource: DataSource;
  /** Original market type the user chose — drives the default simulator tab. */
  marketType: MarketType;
};

function truncateOracleId(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-6)}`;
}

function normalizeAsset(asset: string): { asset: string; symbol: string } {
  const trimmed = asset.replace(/\s+/g, "");
  const parts = asset.split("/").map((p) => p.trim()).filter(Boolean);
  const symbol = parts[0] ?? trimmed;
  return { asset: trimmed || asset, symbol };
}

/**
 * Derives the shared selected-market view both simulator tabs read from.
 * Returns null when no market has been chosen yet on the Markets screen.
 */
export function useSelectedMarket(): SelectedMarketView | null {
  const market = useDemoStore((s) => s.selectedMarket);
  return useMemo(() => {
    if (!market) return null;
    const { asset, symbol } = normalizeAsset(market.asset);
    const oraclePrice = market.oraclePrice ?? market.lastOraclePrice ?? 0;
    const expiryMs = Date.parse(market.expiry);
    return {
      asset,
      symbol,
      oracleId: market.marketId,
      oracleIdShort: truncateOracleId(market.marketId),
      quoteAsset: market.quoteAsset || "USDC",
      expiry: market.expiry,
      expiryMs,
      oraclePrice,
      minStrike: market.minStrike ?? 0,
      tickSize: market.tickSize ?? 0.01,
      oracleStatus: market.oracleStatus,
      dataSource: market.dataSource,
      marketType: market.marketType,
    };
  }, [market]);
}
