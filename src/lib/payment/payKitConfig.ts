/**
 * Sui Payment Kit configuration (Phase 4.8).
 *
 * Reads NEXT_PUBLIC_PAYMENT_MODE + the testnet wiring from env. The Payment Kit
 * SDK already ships with a hard-coded TESTNET_PAYMENT_KIT_PACKAGE_CONFIG (the
 * deployed package + namespace IDs), so we only require the demo-side values:
 * the merchant address that receives the payment, the DUSDC coin type, and an
 * optional registry id when running in "registry" mode.
 *
 * CLAUDE.md rule #2: simulated mode is the default; testnet is opt-in via env.
 */

export type PaymentMode = "simulated" | "testnet";

export type PayKitConfig = {
  mode: PaymentMode;
  namespaceId: string;
  registryId?: string;
  merchantAddress: string;
  dusdcType: string;
  /** Convenience: registry mode = a registry id is configured. */
  registryMode: boolean;
};

const TESTNET_NAMESPACE =
  "0xa5016862fdccba7cc576b56cc5a391eda6775200aaa03a6b3c97d512312878db";

function readMode(): PaymentMode {
  const raw = process.env.NEXT_PUBLIC_PAYMENT_MODE;
  return raw === "testnet" ? "testnet" : "simulated";
}

function readEnv() {
  return {
    namespaceId: process.env.NEXT_PUBLIC_PAYKIT_NAMESPACE,
    registryId: process.env.NEXT_PUBLIC_PAYKIT_REGISTRY,
    merchantAddress: process.env.NEXT_PUBLIC_MERCHANT_ADDRESS,
    dusdcType: process.env.NEXT_PUBLIC_DUSDC_TYPE,
  };
}

export function getPayKitConfig(): PayKitConfig {
  const mode = readMode();
  const raw = readEnv();

  const namespaceId = raw.namespaceId && raw.namespaceId.length > 0
    ? raw.namespaceId
    : TESTNET_NAMESPACE;
  const registryId = raw.registryId && raw.registryId.length > 0
    ? raw.registryId
    : undefined;
  const merchantAddress = raw.merchantAddress ?? "";
  const dusdcType = raw.dusdcType ?? "";

  if (mode === "testnet") {
    const missing: string[] = [];
    if (!merchantAddress) missing.push("NEXT_PUBLIC_MERCHANT_ADDRESS");
    if (!dusdcType) missing.push("NEXT_PUBLIC_DUSDC_TYPE");
    if (missing.length > 0) {
      throw new Error(
        `Payment Kit testnet config missing: ${missing.join(", ")}. ` +
          `Set these env vars or switch NEXT_PUBLIC_PAYMENT_MODE to "simulated".`,
      );
    }
  }

  return {
    mode,
    namespaceId,
    registryId,
    merchantAddress,
    dusdcType,
    registryMode: !!registryId,
  };
}

export function isPayKitTestnetEnabled(): boolean {
  return readMode() === "testnet";
}

export const PAYKIT_TESTNET_NAMESPACE = TESTNET_NAMESPACE;
