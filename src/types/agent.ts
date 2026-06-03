export type AgentPolicy = {
  policyId: string;
  walletAddress: string;
  /**
   * Authorization cap as a decimal-USD string (e.g. "5"). Kept as the
   * historical field name `spendingCap` for Phase 4.8 compatibility; Phase 4.9
   * also exposes the same value as `capAmount`.
   */
  spendingCap: string;
  asset: string;
  allowedRecipient: string;
  purpose: string;
  expiry: string;
  frequencyLimit: number;
  finalActionRequiresUserSignature: boolean;

  // ---- Phase 4.9: bounded research budget ----
  /** Stable id used in the per-prediction Payment Kit nonce (`pf-<wallet>-<budgetId>-<marketId>`). */
  budgetId: string;
  /** Authorization cap in decimal USD (mirror of spendingCap). */
  capAmount: string;
  /** Per-prediction fee in decimal USD. Fixed at "1" in the demo. */
  feePerPrediction: string;
};

export const FEE_PER_PREDICTION = "1";
