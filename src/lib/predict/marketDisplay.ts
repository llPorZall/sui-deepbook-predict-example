import type { OracleStatus, PredictMarket } from "@/types/predict";

export type DisplayOracle = "active" | "pending" | "inactive" | "settled";

export type DisplayMarket = {
  id: string;
  source: "testnet" | "simulated";
  assetGlyph: string;
  assetName: string;
  type: "binary" | "range";
  /** Detail line under the primary headline (legacy "strike" text). */
  strike: string;
  /** Primary card headline, e.g. "BTC/USD ↑ Above $109,000" or "BTC/USD Inside $60k – $72k". */
  primaryLine: string;
  /** True when binary strike isn't yet known (testnet oracles with no fixed strike). */
  strikePending: boolean;
  /** Live oracle spot price (formatted, e.g. "$66,363"). Empty when unknown. */
  oraclePriceText: string;
  status: DisplayOracle;
  /** Short countdown ("00:14:39") or status word for non-active states. */
  countdown: string;
  /** Absolute expiry in the viewer's local timezone, formatted as "22 JUN 2026". Empty when not applicable. */
  expiryAbsolute: string;
  /** Legacy combined string still used in a few places. */
  expiryDisplay: string;
  explain: string;
};

const GLYPHS: Record<string, string> = {
  SUI: "◈",
  BTC: "฿",
  ETH: "Ξ",
  SOL: "◎",
};

const EXPLAIN: Record<DisplayOracle, string> = {
  active: "The oracle is live and this market is open for positions.",
  pending: "Trading has closed; awaiting the oracle's final settlement value.",
  inactive: "This market isn't accepting positions yet — the oracle feed is offline.",
  settled: "The outcome is final and recorded on-chain. No further changes.",
};

export function toDisplayOracle(status: OracleStatus): DisplayOracle {
  switch (status) {
    case "Active":
      return "active";
    case "PendingSettlement":
      return "pending";
    case "Inactive":
      return "inactive";
    case "Settled":
      return "settled";
  }
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatMoney(value: number): string {
  if (value >= 1000) {
    return Math.round(value).toLocaleString("en-US");
  }
  return value.toFixed(2);
}

function formatRangeBound(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    return `$${Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `$${value.toFixed(2)}`;
}

function strikeText(m: PredictMarket): string {
  if (m.marketType === "binary" && m.strike !== undefined) {
    return `Strike $${formatMoney(m.strike)}`;
  }
  if (m.lowerStrike !== undefined && m.higherStrike !== undefined) {
    return `${formatRangeBound(m.lowerStrike)} – ${formatRangeBound(m.higherStrike)}`;
  }
  return "strike pending";
}

function settlementYesNo(m: PredictMarket): string {
  if (m.settlementPrice === undefined) return "Resolved";
  if (m.marketType === "binary" && m.strike !== undefined) {
    const isAbove = m.settlementPrice > m.strike;
    const yes = m.direction === "below" ? !isAbove : isAbove;
    return `Resolved ${yes ? "YES" : "NO"}`;
  }
  if (m.lowerStrike !== undefined && m.higherStrike !== undefined) {
    const inside =
      m.settlementPrice >= m.lowerStrike && m.settlementPrice <= m.higherStrike;
    return `Resolved ${inside ? "YES" : "NO"}`;
  }
  return "Resolved";
}

function formatCountdown(expiry: string, now: number): string {
  const ms = Math.max(0, Date.parse(expiry) - now);
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const remaining = totalSec % 86400;
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const hms = `${pad(h)}:${pad(m)}:${pad(s)}`;
  if (days >= 100) return `99d+ ${hms}`;
  if (days > 0) return `${days}d ${hms}`;
  return hms;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function expiryAbsolute(expiry: string): string {
  const t = Date.parse(expiry);
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  const day = pad(d.getDate());
  const month = MONTHS[d.getMonth()].toUpperCase();
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function expiryDisplay(
  status: DisplayOracle,
  expiry: string,
  now: number,
): string {
  switch (status) {
    case "active":
      return formatCountdown(expiry, now);
    case "pending":
      return "Trading closed";
    case "inactive":
      return "Not open";
    case "settled":
      return "Resolved";
  }
}

function assetSymbolPair(asset: string): string {
  // "BTC / USD" → "BTC/USD"
  return asset.replace(/\s+/g, "");
}

function primaryLineText(m: PredictMarket): string {
  const pair = assetSymbolPair(m.asset);
  if (m.marketType === "binary") {
    if (m.strike !== undefined) {
      const dir = m.direction === "below" ? "↓" : "↑";
      const word = m.direction === "below" ? "Below" : "Above";
      return `${pair} ${dir} ${word} $${formatMoney(m.strike)}`;
    }
    // Testnet oracles have no canonical per-market strike — show the live
    // oracle price instead so the card distinguishes itself by spot + expiry.
    if (m.oraclePrice !== undefined) {
      return `${pair} · $${formatMoney(m.oraclePrice)}`;
    }
    return `${pair} · strike pending`;
  }
  if (m.lowerStrike !== undefined && m.higherStrike !== undefined) {
    return `${pair} ⇔ Inside ${formatRangeBound(m.lowerStrike)} – ${formatRangeBound(m.higherStrike)}`;
  }
  return `${pair} · strike pending`;
}

export function toDisplayMarket(m: PredictMarket, now: number): DisplayMarket {
  const symbol = m.asset.split("/")[0]?.trim().toUpperCase() ?? m.asset;
  const status = toDisplayOracle(m.oracleStatus);
  const isBinary = m.marketType === "binary";
  // Testnet binary markets pick a strike at trade time, so "strike pending"
  // only fires when we have no spot price to show either.
  const strikePending =
    isBinary && m.strike === undefined && m.oraclePrice === undefined;
  const countdown =
    status === "settled"
      ? settlementYesNo(m)
      : expiryDisplay(status, m.expiry, now);
  const absolute = status === "active" ? expiryAbsolute(m.expiry) : "";

  return {
    id: m.marketId,
    source: m.dataSource,
    assetGlyph: GLYPHS[symbol] ?? "◇",
    assetName: m.asset,
    type: isBinary ? "binary" : "range",
    strike: strikeText(m),
    primaryLine: primaryLineText(m),
    strikePending,
    oraclePriceText:
      m.oraclePrice !== undefined ? `$${formatMoney(m.oraclePrice)}` : "",
    status,
    countdown,
    expiryAbsolute: absolute,
    expiryDisplay: countdown,
    explain: EXPLAIN[status],
  };
}
