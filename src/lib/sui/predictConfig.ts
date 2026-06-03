export type PredictConfig = {
  packageId: string;
  registryId: string;
  predictObjectId: string;
  dusdcType: string;
  plpType: string;
};

type PredictConfigField = keyof PredictConfig;

const ENV_KEYS: Record<PredictConfigField, string> = {
  packageId: "NEXT_PUBLIC_PREDICT_PACKAGE",
  registryId: "NEXT_PUBLIC_PREDICT_REGISTRY",
  predictObjectId: "NEXT_PUBLIC_PREDICT_OBJECT",
  dusdcType: "NEXT_PUBLIC_DUSDC_TYPE",
  plpType: "NEXT_PUBLIC_PLP_TYPE",
};

// Literal `process.env.NEXT_PUBLIC_*` accesses — Next.js/Turbopack only inlines
// these when the property name appears verbatim, so bracket notation breaks
// client-side reads.
function readEnv(): Partial<PredictConfig> {
  return {
    packageId: process.env.NEXT_PUBLIC_PREDICT_PACKAGE,
    registryId: process.env.NEXT_PUBLIC_PREDICT_REGISTRY,
    predictObjectId: process.env.NEXT_PUBLIC_PREDICT_OBJECT,
    dusdcType: process.env.NEXT_PUBLIC_DUSDC_TYPE,
    plpType: process.env.NEXT_PUBLIC_PLP_TYPE,
  };
}

export function getPredictConfig(): PredictConfig {
  const raw = readEnv();
  const missing = (Object.keys(ENV_KEYS) as PredictConfigField[]).filter(
    (field) => {
      const value = raw[field];
      return typeof value !== "string" || value.length === 0;
    },
  );

  const dataMode = process.env.NEXT_PUBLIC_DATA_MODE;

  if (missing.length > 0) {
    const missingEnvNames = missing.map((field) => ENV_KEYS[field]);
    if (dataMode === "testnet") {
      throw new Error(
        `Missing DeepBook Predict testnet config: ${missingEnvNames.join(", ")}. ` +
          `Set these env vars or change NEXT_PUBLIC_DATA_MODE to "simulated".`,
      );
    }
    throw new Error(
      `DeepBook Predict config is not set (${missingEnvNames.join(", ")}). ` +
        `This getter should only be called in testnet mode.`,
    );
  }

  return {
    packageId: raw.packageId as string,
    registryId: raw.registryId as string,
    predictObjectId: raw.predictObjectId as string,
    dusdcType: raw.dusdcType as string,
    plpType: raw.plpType as string,
  };
}

export function assertPredictConfigForMode(
  mode: string | undefined = process.env.NEXT_PUBLIC_DATA_MODE,
): void {
  if (mode !== "testnet") return;
  getPredictConfig();
}

export const PREDICT_CONFIG_ENV_KEYS = ENV_KEYS;

/**
 * Pre-provisioned PredictManager owned by the demo wallet. Optional — when
 * unset, the Review screen keeps "Live action" LOCKED with a clear hint.
 */
export function getConfiguredManagerId(): string | null {
  const raw = process.env.NEXT_PUBLIC_PREDICT_MANAGER;
  return raw && raw.length > 0 ? raw : null;
}
