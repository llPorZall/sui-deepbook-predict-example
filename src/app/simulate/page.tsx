"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Coins,
  CreditCard,
  Droplet,
  FlaskConical,
  Info,
  LineChart,
  MoveHorizontal,
  Scale,
  TriangleAlert,
  Wifi,
  Zap,
  CircleDollarSign,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import {
  simulateBinaryPosition,
  simulateRangePosition,
  type SimulationResult,
} from "@/lib/predict/simulator";
import {
  dusdcAmountToBase,
  dusdcBaseToNumber,
  friendlyPricingError,
  getBinaryTradeAmounts,
  getRangeTradeAmounts,
  snapStrikeToTick,
  toStrikeNative,
} from "@/lib/predict/testnetPricer";
import {
  DEMO_STEPS,
  useDemoStore,
  useSelectedMarket,
  type SelectedMarketView,
} from "@/lib/store/demoStore";
import { ActionButton } from "@/components/ui/ActionButton";

const EXPIRY_OPTIONS = [
  { value: 3600, label: "In 1 hour" },
  { value: 21600, label: "In 6 hours" },
  { value: 86400, label: "In 24 hours" },
  { value: 604800, label: "In 7 days" },
];

// Default range band spans N ticks each side of spot.
const DEFAULT_BAND_TICKS = 2;

function parseNumber(input: string): number {
  const n = Number.parseFloat(input);
  return Number.isFinite(n) ? n : 0;
}

function formatStrikeInput(price: number, tickSize: number): string {
  if (!Number.isFinite(tickSize) || tickSize <= 0) return price.toFixed(2);
  const dp = Math.max(0, Math.min(8, -Math.floor(Math.log10(tickSize))));
  return price.toFixed(dp);
}

function formatCountdown(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / 86400);
  const rem = total % 86400;
  const h = Math.floor(rem / 3600);
  const m = Math.floor((rem % 3600) / 60);
  const s = rem % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const hms = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return days > 0 ? `${days}d ${hms}` : hms;
}

function isOnTick(value: number, min: number, tick: number): boolean {
  if (!Number.isFinite(tick) || tick <= 0) return true;
  const steps = (value - min) / tick;
  return Math.abs(steps - Math.round(steps)) <= 1e-6;
}

function validateStrike(
  value: number,
  min: number,
  tick: number,
): string | null {
  if (!Number.isFinite(value) || value <= 0) {
    return "Strike must be a positive number";
  }
  if (value < min) {
    return `Strike must be ≥ $${formatStrikeInput(min, tick)}`;
  }
  if (!isOnTick(value, min, tick)) {
    return `Strike must align to tick $${formatStrikeInput(tick, tick)}`;
  }
  return null;
}

function safeBinary(
  asset: string,
  direction: "above" | "below",
  strike: number,
  expiryIso: string,
  quoteAmount: number,
  lastOraclePrice: number,
): SimulationResult | null {
  try {
    return simulateBinaryPosition({
      asset,
      direction,
      strike,
      lastOraclePrice,
      expiry: expiryIso,
      quoteAmount,
    });
  } catch {
    return null;
  }
}

function safeRange(
  asset: string,
  lower: number,
  higher: number,
  expiryIso: string,
  quoteAmount: number,
  lastOraclePrice: number,
): SimulationResult | null {
  try {
    return simulateRangePosition({
      asset,
      lowerStrike: lower,
      higherStrike: higher,
      lastOraclePrice,
      expiry: expiryIso,
      quoteAmount,
    });
  } catch {
    return null;
  }
}

/** Default binary strike — nearest tick to oraclePrice. */
function defaultBinaryStrike(m: SelectedMarketView): number {
  return snapStrikeToTick(m.oraclePrice, m.minStrike, m.tickSize);
}

/** Default band — spot ± DEFAULT_BAND_TICKS, clamped at minStrike. */
function defaultRangeBand(m: SelectedMarketView): { lower: number; higher: number } {
  const spot = snapStrikeToTick(m.oraclePrice, m.minStrike, m.tickSize);
  const lowerCandidate = spot - DEFAULT_BAND_TICKS * m.tickSize;
  const lower = Math.max(m.minStrike, lowerCandidate);
  // If clamping shortened the lower side, keep the upper side symmetric in
  // tick count so the band still straddles spot.
  const higher = Math.max(lower + m.tickSize, spot + DEFAULT_BAND_TICKS * m.tickSize);
  return { lower, higher };
}

export default function SimulatePage() {
  const router = useRouter();
  const setCurrentStep = useDemoStore((s) => s.setCurrentStep);

  useEffect(() => {
    setCurrentStep(DEMO_STEPS.simulate);
  }, [setCurrentStep]);

  const market = useSelectedMarket();

  if (!market) {
    return (
      <AppShell currentStep={DEMO_STEPS.simulate}>
        <div className="sim-main">
          <div className="page-head page-head--left">
            <h1 className="page-title">Simulator</h1>
            <p className="page-sub">
              Pick a market on the explore screen first — the simulator inherits
              its asset, oracle, expiry, and strike grid.
            </p>
          </div>
          <div className="cta-row">
            <ActionButton
              variant="primary"
              className="btn--lg"
              trailing={<ArrowRight aria-hidden />}
              onAction={() => router.push("/markets")}
              loadingToast={{ title: "Opening markets…" }}
              successToast={{ title: "Markets ready" }}
              errorToast={{ title: "Couldn't open markets" }}
            >
              Go to markets
            </ActionButton>
          </div>
        </div>
      </AppShell>
    );
  }

  return <SimulatorBody market={market} />;
}

function SimulatorBody({ market }: { market: SelectedMarketView }) {
  const router = useRouter();
  const suiClient = useSuiClient();
  const account = useCurrentAccount();
  const setSimulationResult = useDemoStore((s) => s.setSimulationResult);
  const setPreviewedPosition = useDemoStore((s) => s.setPreviewedPosition);
  const simulationResult = useDemoStore((s) => s.simulationResult);

  const isTestnet = market.dataSource === "testnet";

  const [simMode, setSimMode] = useState<"binary" | "range">(
    market.marketType === "vertical_range" ? "range" : "binary",
  );

  // Force re-Preview when inputs or mode change so Continue can't proceed
  // with stale figures. The Preview button is the single commit point.
  useEffect(() => {
    setSimulationResult(null);
    setPreviewedPosition(null);
  }, [setSimulationResult, setPreviewedPosition, simMode]);

  // ---------- Binary inputs ----------
  const [binDirection, setBinDirection] = useState<"above" | "below">("above");
  const [binStrike, setBinStrike] = useState<string>(() =>
    formatStrikeInput(defaultBinaryStrike(market), market.tickSize),
  );
  const [binExpiry, setBinExpiry] = useState(86400);
  const [binQuote, setBinQuote] = useState("10");

  useEffect(() => {
    setSimulationResult(null);
    setPreviewedPosition(null);
  }, [
    setSimulationResult,
    setPreviewedPosition,
    binDirection,
    binStrike,
    binExpiry,
    binQuote,
  ]);

  // Re-seed binary strike whenever the user picks a different market.
  useEffect(() => {
    setBinStrike(formatStrikeInput(defaultBinaryStrike(market), market.tickSize));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market.oracleId]);

  // ---------- Range inputs ----------
  const [rngLower, setRngLower] = useState<string>(() => {
    const b = defaultRangeBand(market);
    return formatStrikeInput(b.lower, market.tickSize);
  });
  const [rngHigher, setRngHigher] = useState<string>(() => {
    const b = defaultRangeBand(market);
    return formatStrikeInput(b.higher, market.tickSize);
  });
  const [rngExpiry, setRngExpiry] = useState(86400);
  const [rngQuote, setRngQuote] = useState("10");

  useEffect(() => {
    setSimulationResult(null);
    setPreviewedPosition(null);
  }, [
    setSimulationResult,
    setPreviewedPosition,
    rngLower,
    rngHigher,
    rngExpiry,
    rngQuote,
  ]);

  // Re-seed band on market change.
  useEffect(() => {
    const b = defaultRangeBand(market);
    setRngLower(formatStrikeInput(b.lower, market.tickSize));
    setRngHigher(formatStrikeInput(b.higher, market.tickSize));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market.oracleId]);

  // ---------- Validation ----------
  const binStrikeNum = parseNumber(binStrike);
  const binStrikeError = useMemo(
    () => validateStrike(binStrikeNum, market.minStrike, market.tickSize),
    [binStrikeNum, market.minStrike, market.tickSize],
  );

  const rngLowerNum = parseNumber(rngLower);
  const rngHigherNum = parseNumber(rngHigher);
  const rngLowerError = useMemo(
    () => validateStrike(rngLowerNum, market.minStrike, market.tickSize),
    [rngLowerNum, market.minStrike, market.tickSize],
  );
  const rngHigherError = useMemo(() => {
    const base = validateStrike(rngHigherNum, market.minStrike, market.tickSize);
    if (base) return base;
    if (rngHigherNum <= rngLowerNum) return "Higher must exceed lower";
    return null;
  }, [rngHigherNum, rngLowerNum, market.minStrike, market.tickSize]);

  // ---------- Expiry ----------
  // Testnet markets carry their on-chain expiry — lock the field. Simulated
  // markets get the relative dropdown so the demo always has a future expiry.
  const hasLockedExpiry =
    isTestnet && Number.isFinite(market.expiryMs);

  function expiryIsoForBinary(): string {
    if (hasLockedExpiry) return new Date(market.expiryMs).toISOString();
    return new Date(Date.now() + binExpiry * 1000).toISOString();
  }
  function expiryIsoForRange(): string {
    if (hasLockedExpiry) return new Date(market.expiryMs).toISOString();
    return new Date(Date.now() + rngExpiry * 1000).toISOString();
  }

  // ---------- Testnet binary pricing ----------
  const [binTestnetPrice, setBinTestnetPrice] = useState<SimulationResult | null>(null);
  const [binTestnetError, setBinTestnetError] = useState<string | null>(null);
  useEffect(() => {
    if (!isTestnet || binStrikeError) {
      setBinTestnetPrice(null);
      setBinTestnetError(null);
      return;
    }
    const quoteUsd = Math.max(0, parseNumber(binQuote));
    const quoteAmountBase = dusdcAmountToBase(quoteUsd);
    if (quoteAmountBase <= BigInt(0) || !Number.isFinite(market.expiryMs)) {
      setBinTestnetPrice(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { cost, maxPayout } = await getBinaryTradeAmounts({
          suiClient,
          oracleId: market.oracleId,
          expiryMs: BigInt(market.expiryMs),
          strikeNative: toStrikeNative(binStrikeNum),
          isAbove: binDirection === "above",
          quoteAmountBase,
          sender: account?.address,
        });
        if (cancelled) return;
        const costUsd = dusdcBaseToNumber(cost);
        const payoutUsd = dusdcBaseToNumber(maxPayout);
        setBinTestnetPrice({
          label: "simplified simulation",
          positionType: "binary",
          condition: `Pays if ${market.symbol} settles ${binDirection} ${binStrikeNum} at expiry`,
          quoteAmount: quoteUsd,
          quoteAsset: market.quoteAsset,
          estimatedCost: costUsd,
          potentialPayout: payoutUsd,
          maxLoss: costUsd,
          expiry: market.expiry,
          riskNote:
            "Live DeepBook Predict pricing via get_trade_amounts. Final actions require your signature.",
        });
        setBinTestnetError(null);
      } catch (err) {
        if (cancelled) return;
        setBinTestnetPrice(null);
        setBinTestnetError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isTestnet,
    suiClient,
    account?.address,
    binDirection,
    binStrikeNum,
    binStrikeError,
    binQuote,
    market.oracleId,
    market.expiryMs,
    market.expiry,
    market.symbol,
    market.quoteAsset,
  ]);

  // ---------- Testnet range pricing ----------
  const [rngTestnetPrice, setRngTestnetPrice] = useState<SimulationResult | null>(null);
  const [rngTestnetError, setRngTestnetError] = useState<string | null>(null);
  useEffect(() => {
    if (!isTestnet || rngLowerError || rngHigherError) {
      setRngTestnetPrice(null);
      setRngTestnetError(null);
      return;
    }
    const quoteUsd = Math.max(0, parseNumber(rngQuote));
    const quoteAmountBase = dusdcAmountToBase(quoteUsd);
    if (quoteAmountBase <= BigInt(0) || !Number.isFinite(market.expiryMs)) {
      setRngTestnetPrice(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { cost, maxPayout } = await getRangeTradeAmounts({
          suiClient,
          oracleId: market.oracleId,
          expiryMs: BigInt(market.expiryMs),
          lowerStrikeNative: toStrikeNative(rngLowerNum),
          higherStrikeNative: toStrikeNative(rngHigherNum),
          quoteAmountBase,
          sender: account?.address,
        });
        if (cancelled) return;
        const costUsd = dusdcBaseToNumber(cost);
        const payoutUsd = dusdcBaseToNumber(maxPayout);
        setRngTestnetPrice({
          label: "simplified simulation",
          positionType: "vertical_range",
          condition: `Pays if ${market.symbol} settles between ${rngLowerNum} and ${rngHigherNum} at expiry`,
          quoteAmount: quoteUsd,
          quoteAsset: market.quoteAsset,
          estimatedCost: costUsd,
          potentialPayout: payoutUsd,
          maxLoss: costUsd,
          expiry: market.expiry,
          riskNote:
            "Live DeepBook Predict pricing via get_range_trade_amounts. Final actions require your signature.",
        });
        setRngTestnetError(null);
      } catch (err) {
        if (cancelled) return;
        setRngTestnetPrice(null);
        setRngTestnetError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isTestnet,
    suiClient,
    account?.address,
    rngLowerNum,
    rngHigherNum,
    rngLowerError,
    rngHigherError,
    rngQuote,
    market.oracleId,
    market.expiryMs,
    market.expiry,
    market.symbol,
    market.quoteAsset,
  ]);

  // ---------- Simulations (prefer live testnet pricing) ----------
  const binarySim = useMemo<SimulationResult | null>(() => {
    if (binStrikeError) return null;
    if (isTestnet && binTestnetPrice) return binTestnetPrice;
    return safeBinary(
      market.symbol,
      binDirection,
      binStrikeNum,
      expiryIsoForBinary(),
      parseNumber(binQuote),
      market.oraclePrice,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isTestnet,
    binTestnetPrice,
    binStrikeError,
    market.symbol,
    market.oraclePrice,
    market.expiryMs,
    binDirection,
    binStrikeNum,
    binExpiry,
    binQuote,
    hasLockedExpiry,
  ]);

  const rangeSim = useMemo<SimulationResult | null>(() => {
    if (rngLowerError || rngHigherError) return null;
    if (isTestnet && rngTestnetPrice) return rngTestnetPrice;
    return safeRange(
      market.symbol,
      rngLowerNum,
      rngHigherNum,
      expiryIsoForRange(),
      parseNumber(rngQuote),
      market.oraclePrice,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isTestnet,
    rngTestnetPrice,
    rngLowerError,
    rngHigherError,
    market.symbol,
    market.oraclePrice,
    market.expiryMs,
    rngLowerNum,
    rngHigherNum,
    rngExpiry,
    rngQuote,
    hasLockedExpiry,
  ]);

  // ---------- Display strings ----------
  const fmt = (p: number) => formatStrikeInput(p, market.tickSize);
  const binCondition = `Pays if ${market.symbol} settles ${binDirection} $${fmt(binStrikeNum)} at expiry; otherwise it expires without payout.`;
  const rngCondition = `Pays if ${market.symbol} settles inside $${fmt(rngLowerNum)}–$${fmt(rngHigherNum)} at expiry; otherwise it expires without payout.`;
  const bandWidth = Math.max(0, rngHigherNum - rngLowerNum);

  // Dynamic axis: include both boundaries and spot, with padding ≈ 25% of
  // the band width (at least 2 ticks) so labels stay readable at any scale.
  const axisPadding = Math.max(
    market.tickSize * 2,
    bandWidth > 0 ? bandWidth * 0.25 : market.tickSize * 2,
  );
  const axisLow = Math.max(
    0,
    Math.min(rngLowerNum, market.oraclePrice) - axisPadding,
  );
  const axisHigh = Math.max(rngHigherNum, market.oraclePrice) + axisPadding;
  const axisRange = Math.max(market.tickSize, axisHigh - axisLow);
  const pctOf = (v: number) =>
    Math.max(0, Math.min(100, ((v - axisLow) / axisRange) * 100));
  const lowerPct = pctOf(rngLowerNum);
  const higherPct = pctOf(rngHigherNum);
  const spotPct = pctOf(market.oraclePrice);
  const bandLeftPct = Math.min(lowerPct, higherPct);
  const bandWidthPct = Math.abs(higherPct - lowerPct);
  const spotInside =
    market.oraclePrice >= rngLowerNum && market.oraclePrice <= rngHigherNum;

  // ---------- Near-expiry hint ----------
  // The DeepBook Predict pricing engine (pricing_config::quote_spread_from_fair_price)
  // rejects quotes when too little time remains — spread → ∞ as t → 0. Warn the
  // user up front so they don't think the empty state is a bug.
  const NEAR_EXPIRY_MS = 10 * 60 * 1000;
  const expiryRemainingMs = hasLockedExpiry
    ? Math.max(0, market.expiryMs - Date.now())
    : Number.POSITIVE_INFINITY;
  const nearExpiry =
    isTestnet && expiryRemainingMs > 0 && expiryRemainingMs < NEAR_EXPIRY_MS;

  // ---------- Pricing badge / footer ----------
  const livePricing =
    isTestnet &&
    ((simMode === "binary" && binTestnetPrice !== null) ||
      (simMode === "range" && rngTestnetPrice !== null));
  const pricingBadgeLabel = livePricing
    ? "Live testnet preview"
    : "Simplified simulation";
  const pricingFootnote = livePricing
    ? simMode === "binary"
      ? "Live DeepBook Predict pricing via get_trade_amounts (devInspect). Real oracle pricing — not yet placed on-chain; final actions require your signature."
      : "Live DeepBook Predict pricing via get_range_trade_amounts (devInspect). Real oracle pricing — not yet placed on-chain; final actions require your signature."
    : "Simplified simulation. Figures are illustrative; final actions require your signature.";
  const pricingError =
    simMode === "binary" ? binTestnetError : rngTestnetError;

  const headerOracleSuffix = `${market.asset} · ${market.oracleIdShort}`;

  return (
    <AppShell currentStep={DEMO_STEPS.simulate}>
      <div className="sim-main">
        <div className="page-head page-head--left">
          <h1 className="page-title">
            {simMode === "binary"
              ? "Binary position simulator"
              : "Vertical range simulator"}
          </h1>
          <p className="page-sub">
            {simMode === "binary"
              ? `Model a single outcome on ${headerOracleSuffix}. `
              : `Model whether ${market.symbol} settles inside a price band on ${headerOracleSuffix}. `}
            {livePricing
              ? "Live testnet pricing — not yet placed on-chain."
              : "Nothing here is placed on-chain — it's a simplified simulation."}
          </p>
        </div>

        <div
          className="segmented segmented--full sim-mode-switch"
          role="radiogroup"
          aria-label="Simulator mode"
        >
          <button
            type="button"
            className={`seg${simMode === "binary" ? " is-active" : ""}`}
            role="radio"
            aria-checked={simMode === "binary"}
            onClick={() => setSimMode("binary")}
          >
            <Scale aria-hidden />
            Binary position
          </button>
          <button
            type="button"
            className={`seg${simMode === "range" ? " is-active" : ""}`}
            role="radio"
            aria-checked={simMode === "range"}
            onClick={() => setSimMode("range")}
          >
            <MoveHorizontal aria-hidden />
            Vertical range
          </button>
        </div>

        {simMode === "binary" && (
          <div className="sim-grid">
            {/* ----- Inputs ----- */}
            <section className="input-panel">
              <div className="field">
                <p className="field-label">
                  <Coins aria-hidden />
                  Asset
                </p>
                <div
                  className="segmented segmented--full"
                  role="radiogroup"
                  aria-label="Asset"
                >
                  <button
                    type="button"
                    className="seg is-active"
                    role="radio"
                    aria-checked="true"
                  >
                    <Droplet aria-hidden />
                    {market.symbol}
                  </button>
                  <button type="button" className="seg" disabled>
                    More soon
                  </button>
                </div>
              </div>

              <div className="field">
                <p className="field-label">
                  <ArrowUpDown aria-hidden />
                  Direction
                </p>
                <div
                  className="segmented segmented--full"
                  role="radiogroup"
                  aria-label="Direction"
                >
                  <button
                    type="button"
                    className={`seg seg--up${binDirection === "above" ? " is-active" : ""}`}
                    role="radio"
                    aria-checked={binDirection === "above"}
                    onClick={() => setBinDirection("above")}
                  >
                    <ArrowUp aria-hidden />
                    Above
                  </button>
                  <button
                    type="button"
                    className={`seg seg--down${binDirection === "below" ? " is-active" : ""}`}
                    role="radio"
                    aria-checked={binDirection === "below"}
                    onClick={() => setBinDirection("below")}
                  >
                    <ArrowDown aria-hidden />
                    Below
                  </button>
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="bin-strike">
                  <ArrowUp aria-hidden />
                  Strike price
                </label>
                <div className="text-input">
                  <span className="pre">$</span>
                  <input
                    id="bin-strike"
                    type="number"
                    inputMode="decimal"
                    min={market.minStrike || undefined}
                    step={market.tickSize || "any"}
                    value={binStrike}
                    aria-invalid={binStrikeError ? true : undefined}
                    onChange={(e) => setBinStrike(e.target.value)}
                  />
                  <span className="post">USD</span>
                </div>
                <p className="field-hint">
                  Min ${fmt(market.minStrike)} · tick ${fmt(market.tickSize)} ·
                  spot ${fmt(market.oraclePrice)}
                </p>
                {binStrikeError && (
                  <p className="field-error" role="alert">
                    <TriangleAlert aria-hidden />
                    {binStrikeError}
                  </p>
                )}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="bin-expiry">
                  <Clock aria-hidden />
                  Expiry
                </label>
                {hasLockedExpiry ? (
                  <div className="locked-expiry">
                    <span className="locked-expiry-abs">
                      {new Date(market.expiryMs)
                        .toISOString()
                        .replace("T", " ")
                        .slice(0, 16)}{" "}
                      UTC
                    </span>
                    <span className="locked-expiry-cd">
                      {formatCountdown(
                        Math.max(0, (market.expiryMs - Date.now()) / 1000),
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="select-wrap">
                    <select
                      id="bin-expiry"
                      className="field-select"
                      value={binExpiry}
                      onChange={(e) => setBinExpiry(Number(e.target.value))}
                    >
                      {EXPIRY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="caret" aria-hidden />
                  </div>
                )}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="bin-quote">
                  <CircleDollarSign aria-hidden />
                  Quote amount
                </label>
                <div className="text-input">
                  <input
                    id="bin-quote"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={binQuote}
                    onChange={(e) =>
                      setBinQuote(e.target.value.replace(/[^0-9]/g, ""))
                    }
                  />
                  <span className="post">{isTestnet ? market.quoteAsset : `testnet ${market.quoteAsset}`}</span>
                </div>
              </div>

              <ActionButton
                variant="primary"
                className="btn--lg preview-btn"
                leading={<Zap aria-hidden />}
                disabled={!binarySim}
                onAction={() => {
                  if (!binarySim)
                    throw new Error(
                      "Adjust the inputs to produce a valid simulation",
                    );
                  setSimulationResult(binarySim);
                  const quantity = Math.max(
                    0,
                    Math.floor(parseNumber(binQuote)),
                  );
                  const expiryMs = hasLockedExpiry
                    ? market.expiryMs
                    : Date.now() + binExpiry * 1000;
                  setPreviewedPosition({
                    kind: "binary",
                    oracleId: market.oracleId,
                    expiryMs,
                    strike: binStrikeNum,
                    direction: binDirection,
                    quantity,
                  });
                }}
                loadingToast={{ title: "Running simulation…" }}
                successToast={{
                  title: "Binary simulation ready",
                  description: `${market.symbol} ${binDirection} $${fmt(binStrikeNum)}`,
                }}
                errorToast={{ title: "Couldn't simulate" }}
              >
                Preview
              </ActionButton>
            </section>

            {/* ----- Result ----- */}
            <section className="result-card">
              <header className="res-head">
                <div className="res-head-l">
                  <LineChart aria-hidden />
                  <p>Simulated outcome</p>
                </div>
                <span className="sim-tag">
                  <FlaskConical aria-hidden />
                  {pricingBadgeLabel}
                </span>
              </header>

              <div className="payoff">
                <Info aria-hidden />
                <span>{binCondition}</span>
              </div>

              <div className="res-figures">
                <div className="figure">
                  <p className="fig-label">
                    <CreditCard aria-hidden />
                    Estimated cost
                  </p>
                  <p className="fig-val">
                    {(binarySim?.estimatedCost ?? 0).toFixed(2)}{" "}
                    <span className="unit">{market.quoteAsset}</span>
                  </p>
                </div>
                <div className="figure">
                  <p className="fig-label">
                    <ArrowDown aria-hidden />
                    Max loss
                  </p>
                  <p className="fig-val fig-val--loss">
                    {(binarySim?.maxLoss ?? 0).toFixed(2)}{" "}
                    <span className="unit">{market.quoteAsset}</span>
                  </p>
                </div>
                <div className="figure figure--payout">
                  <p className="fig-label">
                    <ArrowUp aria-hidden />
                    Potential payout
                  </p>
                  <p className="fig-val fig-val--gain">
                    {(binarySim?.potentialPayout ?? 0).toFixed(2)}{" "}
                    <span className="unit">{market.quoteAsset}</span>
                  </p>
                </div>
              </div>

              <div className="res-rows">
                <div className="res-row">
                  <span className="res-k">
                    <ClipboardCheck aria-hidden />
                    Settlement condition
                  </span>
                  <span className="res-v">
                    {market.symbol} {binDirection === "above" ? ">" : "<"} $
                    {fmt(binStrikeNum)} at expiry
                  </span>
                </div>
                <div className="res-row">
                  <span className="res-k">
                    <Wifi aria-hidden />
                    Oracle dependency
                  </span>
                  <span className="res-v">
                    <span className="badge badge--success">
                      <Wifi aria-hidden />
                      Active feed required
                    </span>
                  </span>
                </div>
                <div className="res-row">
                  <span className="res-k">
                    <Clock aria-hidden />
                    Expiry countdown
                  </span>
                  <span className="res-v">
                    {hasLockedExpiry
                      ? formatCountdown(
                          Math.max(0, (market.expiryMs - Date.now()) / 1000),
                        )
                      : formatCountdown(binExpiry)}
                  </span>
                </div>
              </div>

              <div className="res-foot">
                {nearExpiry && (
                  <p className="field-hint" role="status">
                    <Clock aria-hidden />
                    This market expires in under 10 minutes — DeepBook Predict
                    may refuse to quote ATM strikes this close to settlement.
                    Pick a market with more time on the clock if pricing fails.
                  </p>
                )}
                <p className="res-disclaimer">
                  <TriangleAlert aria-hidden />
                  {pricingFootnote}
                </p>
                {isTestnet && pricingError && (
                  <p className="field-error" role="alert">
                    <TriangleAlert aria-hidden />
                    Live pricing unavailable: {friendlyPricingError(pricingError)} Showing
                    illustrative figures instead.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}

        {simMode === "range" && (
          <>
            {/* ----- Range visualization ----- */}
            <section
              className="viz-card"
              aria-label="Settlement band visualization"
            >
              <div className="viz-head">
                <div className="viz-head-l">
                  <MoveHorizontal aria-hidden />
                  <p>
                    Settlement band · {market.asset} · {market.oracleIdShort}
                  </p>
                </div>
                <span className="viz-spot-readout">
                  Oracle price <b>${fmt(market.oraclePrice)}</b>
                </span>
              </div>

              <div className="axis-track">
                <div className="axis-line" />
                <div
                  className="band"
                  style={{ left: `${bandLeftPct}%`, width: `${bandWidthPct}%` }}
                />
                <div className="boundary" style={{ left: `${lowerPct}%` }} />
                <div className="boundary" style={{ left: `${higherPct}%` }} />
                <div className="boundary-label" style={{ left: `${lowerPct}%` }}>
                  <span className="boundary-cap">Lower</span>${fmt(rngLowerNum)}
                </div>
                <div className="boundary-label" style={{ left: `${higherPct}%` }}>
                  <span className="boundary-cap">Upper</span>${fmt(rngHigherNum)}
                </div>
                <div className="spot-pin" style={{ left: `${spotPct}%` }}>
                  <span className="spot-dot" aria-hidden />
                  <span
                    className={`spot-flag ${spotInside ? "spot-flag--inside" : "spot-flag--outside"}`}
                  >
                    {spotInside ? "Inside band" : "Outside band"}
                  </span>
                </div>
              </div>
              <div className="axis-ends">
                <span>${fmt(axisLow)}</span>
                <span>${fmt(axisHigh)}</span>
              </div>
            </section>

            <div className="sim-grid">
              {/* ----- Inputs ----- */}
              <section className="input-panel">
                <div className="field">
                  <p className="field-label">
                    <Coins aria-hidden />
                    Asset
                  </p>
                  <div
                    className="segmented segmented--full"
                    role="radiogroup"
                    aria-label="Asset"
                  >
                    <button
                      type="button"
                      className="seg is-active"
                      role="radio"
                      aria-checked="true"
                    >
                      <Droplet aria-hidden />
                      {market.symbol}
                    </button>
                    <button type="button" className="seg" disabled>
                      More soon
                    </button>
                  </div>
                </div>

                <div className="field">
                  <p className="field-label">
                    <MoveHorizontal aria-hidden />
                    Price band
                  </p>
                  <div className="field-2col">
                    <div className="text-input">
                      <span className="pre">$</span>
                      <input
                        id="rng-lower"
                        type="number"
                        inputMode="decimal"
                        min={market.minStrike || undefined}
                        step={market.tickSize || "any"}
                        value={rngLower}
                        aria-invalid={rngLowerError ? true : undefined}
                        onChange={(e) => setRngLower(e.target.value)}
                        aria-label="Lower price"
                      />
                      <span className="post">low</span>
                    </div>
                    <div className="text-input">
                      <span className="pre">$</span>
                      <input
                        id="rng-higher"
                        type="number"
                        inputMode="decimal"
                        min={market.minStrike || undefined}
                        step={market.tickSize || "any"}
                        value={rngHigher}
                        aria-invalid={rngHigherError ? true : undefined}
                        onChange={(e) => setRngHigher(e.target.value)}
                        aria-label="Higher price"
                      />
                      <span className="post">high</span>
                    </div>
                  </div>
                  <p className="field-hint">
                    Min ${fmt(market.minStrike)} · tick ${fmt(market.tickSize)} ·
                    spot ${fmt(market.oraclePrice)}
                  </p>
                  {rngLowerError && (
                    <p className="field-error" role="alert">
                      <TriangleAlert aria-hidden />
                      Lower: {rngLowerError}
                    </p>
                  )}
                  {rngHigherError && (
                    <p className="field-error" role="alert">
                      <TriangleAlert aria-hidden />
                      Higher: {rngHigherError}
                    </p>
                  )}
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="rng-expiry">
                    <Clock aria-hidden />
                    Expiry
                  </label>
                  {hasLockedExpiry ? (
                    <div className="locked-expiry">
                      <span className="locked-expiry-abs">
                        {new Date(market.expiryMs)
                          .toISOString()
                          .replace("T", " ")
                          .slice(0, 16)}{" "}
                        UTC
                      </span>
                      <span className="locked-expiry-cd">
                        {formatCountdown(
                          Math.max(0, (market.expiryMs - Date.now()) / 1000),
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="select-wrap">
                      <select
                        id="rng-expiry"
                        className="field-select"
                        value={rngExpiry}
                        onChange={(e) => setRngExpiry(Number(e.target.value))}
                      >
                        {EXPIRY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="caret" aria-hidden />
                    </div>
                  )}
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="rng-quote">
                    <CircleDollarSign aria-hidden />
                    Quote amount
                  </label>
                  <div className="text-input">
                    <input
                      id="rng-quote"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={rngQuote}
                      onChange={(e) =>
                        setRngQuote(e.target.value.replace(/[^0-9]/g, ""))
                      }
                    />
                    <span className="post">{isTestnet ? market.quoteAsset : `testnet ${market.quoteAsset}`}</span>
                  </div>
                </div>

                <ActionButton
                  variant="primary"
                  className="btn--lg preview-btn"
                  leading={<Zap aria-hidden />}
                  disabled={!rangeSim}
                  onAction={() => {
                    if (!rangeSim)
                      throw new Error(
                        "Adjust the inputs to produce a valid simulation",
                      );
                    setSimulationResult(rangeSim);
                    const quantity = Math.max(
                      0,
                      Math.floor(parseNumber(rngQuote)),
                    );
                    const expiryMs = hasLockedExpiry
                      ? market.expiryMs
                      : Date.now() + rngExpiry * 1000;
                    setPreviewedPosition({
                      kind: "range",
                      oracleId: market.oracleId,
                      expiryMs,
                      lowerStrike: rngLowerNum,
                      higherStrike: rngHigherNum,
                      quantity,
                    });
                  }}
                  loadingToast={{ title: "Running simulation…" }}
                  successToast={{
                    title: "Range simulation ready",
                    description: `${market.symbol} between $${fmt(rngLowerNum)}–$${fmt(rngHigherNum)}`,
                  }}
                  errorToast={{ title: "Couldn't simulate" }}
                >
                  Preview
                </ActionButton>
              </section>

              {/* ----- Result ----- */}
              <section className="result-card">
                <header className="res-head">
                  <div className="res-head-l">
                    <LineChart aria-hidden />
                    <p>Simulated outcome</p>
                  </div>
                  <span className="sim-tag">
                    <FlaskConical aria-hidden />
                    {pricingBadgeLabel}
                  </span>
                </header>

                <div className="payoff">
                  <Info aria-hidden />
                  <span>{rngCondition}</span>
                </div>

                <div className="res-figures">
                  <div className="figure">
                    <p className="fig-label">
                      <CreditCard aria-hidden />
                      Estimated cost
                    </p>
                    <p className="fig-val">
                      {(rangeSim?.estimatedCost ?? 0).toFixed(2)}{" "}
                      <span className="unit">{market.quoteAsset}</span>
                    </p>
                  </div>
                  <div className="figure">
                    <p className="fig-label">
                      <ArrowDown aria-hidden />
                      Max loss
                    </p>
                    <p className="fig-val fig-val--loss">
                      {(rangeSim?.maxLoss ?? 0).toFixed(2)}{" "}
                      <span className="unit">{market.quoteAsset}</span>
                    </p>
                  </div>
                  <div className="figure figure--payout">
                    <p className="fig-label">
                      <ArrowUp aria-hidden />
                      Potential payout
                    </p>
                    <p className="fig-val fig-val--gain">
                      {(rangeSim?.potentialPayout ?? 0).toFixed(2)}{" "}
                      <span className="unit">{market.quoteAsset}</span>
                    </p>
                  </div>
                </div>

                <div className="res-rows">
                  <div className="res-row">
                    <span className="res-k">
                      <ClipboardCheck aria-hidden />
                      Payoff condition
                    </span>
                    <span className="res-v">
                      ${fmt(rngLowerNum)} ≤ {market.symbol} ≤ ${fmt(rngHigherNum)}
                    </span>
                  </div>
                  <div className="res-row">
                    <span className="res-k">
                      <MoveHorizontal aria-hidden />
                      Band width
                    </span>
                    <span className="res-v">${fmt(bandWidth)}</span>
                  </div>
                  <div className="res-row">
                    <span className="res-k">
                      <Clock aria-hidden />
                      Expiry countdown
                    </span>
                    <span className="res-v">
                      {hasLockedExpiry
                        ? formatCountdown(
                            Math.max(0, (market.expiryMs - Date.now()) / 1000),
                          )
                        : formatCountdown(rngExpiry)}
                    </span>
                  </div>
                </div>

                <div className="res-foot">
                  <p className="res-disclaimer">
                    <TriangleAlert aria-hidden />
                    {pricingFootnote}
                  </p>
                  {isTestnet && pricingError && (
                    <p className="field-error" role="alert">
                      <TriangleAlert aria-hidden />
                      Live pricing unavailable: {pricingError}. Showing
                      illustrative figures instead.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </>
        )}

        <div className="cta-row">
          {!simulationResult && (
            <p className="cta-hint" role="status">
              <Info aria-hidden />
              Run Preview to lock in this simulation before continuing.
            </p>
          )}
          <ActionButton
            variant="primary"
            className="btn--lg cta-continue"
            trailing={<ArrowRight aria-hidden />}
            disabled={!simulationResult}
            onAction={() => router.push("/review")}
            loadingToast={{ title: "Opening review…" }}
            successToast={{ title: "Review ready" }}
            errorToast={{ title: "Couldn't open review" }}
          >
            Continue to Review
          </ActionButton>
        </div>
      </div>
    </AppShell>
  );
}
