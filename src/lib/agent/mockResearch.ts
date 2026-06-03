import type { PredictMarket } from "@/types/predict";
import { assertNoBannedWords } from "./guardrails";

export type ResearchBullet = { title: string; body: string };

export type ResearchSummary = {
  marketId: string;
  generatedAt: string;
  context: string;
  payoff: string;
  risks: ResearchBullet[];
  toVerify: ResearchBullet[];
  finalReminder: string;
};

const RISKS: readonly ResearchBullet[] = [
  {
    title: "Oracle dependency",
    body: "Settlement relies entirely on the oracle feed. If it is delayed or becomes inactive, settlement is delayed too.",
  },
  {
    title: "Expiry timing",
    body: "The settlement value is read only at expiry, not before — the outcome can change up to that moment.",
  },
  {
    title: "Vault health",
    body: "Any payout is bounded by available vault liquidity and current utilization.",
  },
  {
    title: "Simulated data",
    body: "Figures shown use simulated or testnet values and do not reflect real prices.",
  },
];

const TO_VERIFY: readonly ResearchBullet[] = [
  {
    title: "Oracle status",
    body: "Confirm the feed is Active and reporting before relying on it.",
  },
  {
    title: "Expiry",
    body: "Confirm the exact settlement time and timezone independently.",
  },
  {
    title: "Vault health",
    body: "Confirm current liquidity, liabilities, and utilization independently.",
  },
  {
    title: "Settlement rules",
    body: "Confirm the precise condition that determines the outcome independently.",
  },
];

const FINAL_REMINDER =
  "This assistant can prepare and explain analysis. It cannot place positions. Final financial actions require user approval and signature.";

function formatStrike(value: number | undefined): string {
  if (value === undefined) return "—";
  return value >= 1000 ? `${Math.round(value).toLocaleString("en-US")}` : value.toString();
}

function payoffTemplate(m: PredictMarket): string {
  if (m.marketType === "binary") {
    const dir = m.direction === "below" ? "below" : "above";
    return `The market resolves YES if ${m.asset} settles ${dir} ${formatStrike(m.strike)} at expiry; otherwise it resolves NO and the position expires without payout.`;
  }
  return `The market resolves YES if ${m.asset} settles between ${formatStrike(m.lowerStrike)} and ${formatStrike(m.higherStrike)} at expiry; otherwise it resolves NO and the position expires without payout.`;
}

function contextTemplate(m: PredictMarket): string {
  const kind = m.marketType === "binary" ? "binary" : "vertical-range";
  return `This market represents whether ${m.asset} settles within a defined outcome at expiry. It is a ${kind} market, so it resolves to one of two outcomes based on the oracle's settlement value. Oracle status is ${m.oracleStatus}; the scenario can be inspected here using ${m.dataSource} data. The user must independently verify every detail before any real action.`;
}

/**
 * Deterministic, market-keyed research summary wrapped in a fixed template
 * that passes the AI guardrail. Same `market` → identical output.
 */
export function generateResearch(
  market: PredictMarket,
  now: Date = new Date(),
): ResearchSummary {
  const summary: ResearchSummary = {
    marketId: market.marketId,
    generatedAt: now.toISOString(),
    context: contextTemplate(market),
    payoff: payoffTemplate(market),
    risks: RISKS.slice(),
    toVerify: TO_VERIFY.slice(),
    finalReminder: FINAL_REMINDER,
  };

  // Defense in depth: every string the panel renders is checked at generation time.
  assertNoBannedWords(summary.context, "research.context");
  assertNoBannedWords(summary.payoff, "research.payoff");
  for (const r of summary.risks) {
    assertNoBannedWords(r.title, "research.risks.title");
    assertNoBannedWords(r.body, "research.risks.body");
  }
  for (const v of summary.toVerify) {
    assertNoBannedWords(v.title, "research.toVerify.title");
    assertNoBannedWords(v.body, "research.toVerify.body");
  }
  assertNoBannedWords(summary.finalReminder, "research.finalReminder");

  return summary;
}
