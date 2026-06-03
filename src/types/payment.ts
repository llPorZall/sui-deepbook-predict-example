export type GasStrategy = "normal" | "sponsored" | "gasless" | "simulated";

export type PaymentIntentStatus =
  | "draft"
  | "previewed"
  | "paid"
  | "failed"
  | "expired";

export type PaymentIntent = {
  id: string;
  walletAddress: string;
  recipient: string;
  amount: string;
  asset: string;
  purpose: string;
  expiry: string;
  gasStrategy: GasStrategy;
  status: PaymentIntentStatus;
  duplicateProtectionKey: string;
};

export type ReceiptStatus = "paid" | "simulated" | "failed";

export type Receipt = {
  receiptId: string;
  paymentIntentId: string;
  walletAddress: string;
  recipient: string;
  amount: string;
  asset: string;
  purpose: string;
  timestamp: string;
  network: string;
  txDigest?: string;
  status: ReceiptStatus;
};
