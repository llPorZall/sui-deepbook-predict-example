// Typed client for the public Predict server.
// Endpoint paths and response shapes were discovered against
// https://predict-server.testnet.mystenlabs.com — keep aligned with that API
// (snake_case fields, plural /predicts, /vault/summary, no per-oracle path).

export type PredictState = {
  predictId: string;
  quoteAssetTypes: string[];
  tradingPaused: boolean | null;
  pricing: unknown;
  risk: unknown;
};

export type OracleSummary = {
  predictId: string;
  oracleId: string;
  oracleCapId: string;
  underlyingAsset: string;
  expiryMs: number;
  minStrike: number;
  tickSize: number;
  status: string;
  activatedAt: number | null;
  settlementPrice: number | null;
  settledAt: number | null;
};

export type VaultSummaryDto = {
  predictId: string;
  quoteAssetTypes: string[];
  vaultBalance: number;
  vaultValue: number;
  totalMtm: number;
  totalMaxPayout: number;
  availableLiquidity: number;
  availableWithdrawal: number;
  plpTotalSupply: number;
  plpSharePrice: number;
  utilization: number;
  maxPayoutUtilization: number;
  netDeposits: number;
  totalSupplied: number;
  totalWithdrawn: number;
};

export type ManagerSummaryDto = {
  managerId: string;
  owner: string;
  balances: { quoteAsset: string; balance: number }[];
  tradingBalance: number;
  openExposure: number;
  redeemableValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  accountValue: number;
  openPositions: number;
  awaitingSettlementPositions: number;
};

export type ManagerPositionDto = {
  predictId: string;
  managerId: string;
  quoteAsset: string;
  oracleId: string;
  underlyingAsset: string;
  expiryMs: number;
  /** Raw scaled strike (oracle price decimals = 9). */
  strike: number;
  isUp: boolean;
  mintedQuantity: number;
  redeemedQuantity: number;
  openQuantity: number;
  totalCost: number;
  totalPayout: number;
  realizedPnl: number;
  unrealizedPnl: number;
  openCostBasis: number;
  averageEntryPrice: number;
  averageExitPrice: number;
  /** Mark price in raw scaled units. */
  markPrice: number;
  /** Mark value in DUSDC base units. */
  markValue: number;
  status: string;
  firstMintedAt: number;
  lastActivityAt: number;
};

export type ManagerPnlPoint = {
  timestampMs: number;
  realizedPnl: number;
  cumulativeRealizedPnl: number;
};

export type ManagerPnlDto = {
  managerId: string;
  range: string;
  seriesType: string;
  points: ManagerPnlPoint[];
  currentUnrealizedPnl: number;
  currentTotalPnl: number;
};

export type OracleStateDto = {
  oracle: OracleSummary;
  /** Latest on-chain spot price in raw scaled units (price decimals = 9). */
  latestSpotPrice: number | null;
  /** Latest forward price in raw scaled units. */
  latestForwardPrice: number | null;
};

export class PredictServerError extends Error {
  readonly status?: number;
  readonly endpoint: string;
  readonly cause?: unknown;

  constructor(
    message: string,
    opts: { endpoint: string; status?: number; cause?: unknown } = {
      endpoint: "",
    },
  ) {
    super(message);
    this.name = "PredictServerError";
    this.endpoint = opts.endpoint;
    this.status = opts.status;
    this.cause = opts.cause;
  }
}

export interface PredictServerClient {
  getState(predictId: string): Promise<PredictState>;
  listOracles(predictId: string): Promise<OracleSummary[]>;
  getOracle(predictId: string, oracleId: string): Promise<OracleSummary | null>;
  getQuoteAssets(predictId: string): Promise<string[]>;
  getVaultSummary(predictId: string): Promise<VaultSummaryDto>;
  getManagerSummary(managerId: string): Promise<ManagerSummaryDto | null>;
  getManagerPositions(managerId: string): Promise<ManagerPositionDto[]>;
  getManagerPnl(managerId: string): Promise<ManagerPnlDto | null>;
  getOracleState(oracleId: string): Promise<OracleStateDto>;
}

type Fetcher = typeof fetch;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function requireString(
  obj: Record<string, unknown>,
  key: string,
  endpoint: string,
): string {
  const value = asString(obj[key]);
  if (value === undefined || value.length === 0) {
    throw new PredictServerError(
      `Response from ${endpoint} missing required string field "${key}"`,
      { endpoint },
    );
  }
  return value;
}

function requireNumber(
  obj: Record<string, unknown>,
  key: string,
  endpoint: string,
): number {
  const value = asNumber(obj[key]);
  if (value === undefined) {
    throw new PredictServerError(
      `Response from ${endpoint} missing required numeric field "${key}"`,
      { endpoint },
    );
  }
  return value;
}

function parsePredictState(data: unknown, endpoint: string): PredictState {
  if (!isObject(data)) {
    throw new PredictServerError(
      `Response from ${endpoint} is not an object`,
      { endpoint },
    );
  }
  const tradingPausedRaw = data["trading_paused"];
  return {
    predictId: requireString(data, "predict_id", endpoint),
    quoteAssetTypes: asStringArray(data["quote_assets"]),
    tradingPaused:
      typeof tradingPausedRaw === "boolean" ? tradingPausedRaw : null,
    pricing: data["pricing"] ?? null,
    risk: data["risk"] ?? null,
  };
}

function parseOracle(data: unknown, endpoint: string): OracleSummary {
  if (!isObject(data)) {
    throw new PredictServerError(
      `Response from ${endpoint} is not an oracle object`,
      { endpoint },
    );
  }
  return {
    predictId: requireString(data, "predict_id", endpoint),
    oracleId: requireString(data, "oracle_id", endpoint),
    oracleCapId: requireString(data, "oracle_cap_id", endpoint),
    underlyingAsset: requireString(data, "underlying_asset", endpoint),
    expiryMs: requireNumber(data, "expiry", endpoint),
    minStrike: requireNumber(data, "min_strike", endpoint),
    tickSize: requireNumber(data, "tick_size", endpoint),
    status: requireString(data, "status", endpoint),
    activatedAt: asNumber(data["activated_at"]) ?? null,
    settlementPrice: asNumber(data["settlement_price"]) ?? null,
    settledAt: asNumber(data["settled_at"]) ?? null,
  };
}

function parseVaultSummary(data: unknown, endpoint: string): VaultSummaryDto {
  if (!isObject(data)) {
    throw new PredictServerError(
      `Response from ${endpoint} is not an object`,
      { endpoint },
    );
  }
  return {
    predictId: requireString(data, "predict_id", endpoint),
    quoteAssetTypes: asStringArray(data["quote_assets"]),
    vaultBalance: requireNumber(data, "vault_balance", endpoint),
    vaultValue: requireNumber(data, "vault_value", endpoint),
    totalMtm: requireNumber(data, "total_mtm", endpoint),
    totalMaxPayout: requireNumber(data, "total_max_payout", endpoint),
    availableLiquidity: requireNumber(data, "available_liquidity", endpoint),
    availableWithdrawal: requireNumber(data, "available_withdrawal", endpoint),
    plpTotalSupply: requireNumber(data, "plp_total_supply", endpoint),
    plpSharePrice: requireNumber(data, "plp_share_price", endpoint),
    utilization: requireNumber(data, "utilization", endpoint),
    maxPayoutUtilization: requireNumber(
      data,
      "max_payout_utilization",
      endpoint,
    ),
    netDeposits: requireNumber(data, "net_deposits", endpoint),
    totalSupplied: requireNumber(data, "total_supplied", endpoint),
    totalWithdrawn: requireNumber(data, "total_withdrawn", endpoint),
  };
}

function parseOracleState(data: unknown, endpoint: string): OracleStateDto {
  if (!isObject(data)) {
    throw new PredictServerError(
      `Response from ${endpoint} is not an object`,
      { endpoint },
    );
  }
  const oracle = parseOracle(data["oracle"], endpoint);
  const latest = isObject(data["latest_price"]) ? data["latest_price"] : null;
  return {
    oracle,
    latestSpotPrice: latest ? (asNumber(latest["spot"]) ?? null) : null,
    latestForwardPrice: latest ? (asNumber(latest["forward"]) ?? null) : null,
  };
}

function parseManagerSummary(
  data: unknown,
  endpoint: string,
): ManagerSummaryDto {
  if (!isObject(data)) {
    throw new PredictServerError(
      `Response from ${endpoint} is not a manager summary object`,
      { endpoint },
    );
  }
  const balancesRaw = Array.isArray(data["balances"]) ? data["balances"] : [];
  const balances = balancesRaw.flatMap((b) => {
    if (!isObject(b)) return [];
    const quoteAsset = asString(b["quote_asset"]);
    const balance = asNumber(b["balance"]);
    if (!quoteAsset || balance === undefined) return [];
    return [{ quoteAsset, balance }];
  });
  return {
    managerId: requireString(data, "manager_id", endpoint),
    owner: requireString(data, "owner", endpoint),
    balances,
    tradingBalance: asNumber(data["trading_balance"]) ?? 0,
    openExposure: asNumber(data["open_exposure"]) ?? 0,
    redeemableValue: asNumber(data["redeemable_value"]) ?? 0,
    realizedPnl: asNumber(data["realized_pnl"]) ?? 0,
    unrealizedPnl: asNumber(data["unrealized_pnl"]) ?? 0,
    accountValue: asNumber(data["account_value"]) ?? 0,
    openPositions: asNumber(data["open_positions"]) ?? 0,
    awaitingSettlementPositions:
      asNumber(data["awaiting_settlement_positions"]) ?? 0,
  };
}

function parseManagerPosition(
  data: unknown,
  endpoint: string,
): ManagerPositionDto {
  if (!isObject(data)) {
    throw new PredictServerError(
      `Response from ${endpoint} is not a position object`,
      { endpoint },
    );
  }
  return {
    predictId: requireString(data, "predict_id", endpoint),
    managerId: requireString(data, "manager_id", endpoint),
    quoteAsset: requireString(data, "quote_asset", endpoint),
    oracleId: requireString(data, "oracle_id", endpoint),
    underlyingAsset: requireString(data, "underlying_asset", endpoint),
    expiryMs: requireNumber(data, "expiry", endpoint),
    strike: requireNumber(data, "strike", endpoint),
    isUp: data["is_up"] === true,
    mintedQuantity: asNumber(data["minted_quantity"]) ?? 0,
    redeemedQuantity: asNumber(data["redeemed_quantity"]) ?? 0,
    openQuantity: asNumber(data["open_quantity"]) ?? 0,
    totalCost: asNumber(data["total_cost"]) ?? 0,
    totalPayout: asNumber(data["total_payout"]) ?? 0,
    realizedPnl: asNumber(data["realized_pnl"]) ?? 0,
    unrealizedPnl: asNumber(data["unrealized_pnl"]) ?? 0,
    openCostBasis: asNumber(data["open_cost_basis"]) ?? 0,
    averageEntryPrice: asNumber(data["average_entry_price"]) ?? 0,
    averageExitPrice: asNumber(data["average_exit_price"]) ?? 0,
    markPrice: asNumber(data["mark_price"]) ?? 0,
    markValue: asNumber(data["mark_value"]) ?? 0,
    status: requireString(data, "status", endpoint),
    firstMintedAt: asNumber(data["first_minted_at"]) ?? 0,
    lastActivityAt: asNumber(data["last_activity_at"]) ?? 0,
  };
}

function parseManagerPnl(data: unknown, endpoint: string): ManagerPnlDto {
  if (!isObject(data)) {
    throw new PredictServerError(
      `Response from ${endpoint} is not a manager pnl object`,
      { endpoint },
    );
  }
  const pointsRaw = Array.isArray(data["points"]) ? data["points"] : [];
  const points = pointsRaw.flatMap((p) => {
    if (!isObject(p)) return [];
    const timestampMs = asNumber(p["timestamp_ms"]);
    if (timestampMs === undefined) return [];
    return [
      {
        timestampMs,
        realizedPnl: asNumber(p["realized_pnl"]) ?? 0,
        cumulativeRealizedPnl:
          asNumber(p["cumulative_realized_pnl"]) ?? 0,
      },
    ];
  });
  return {
    managerId: requireString(data, "manager_id", endpoint),
    range: asString(data["range"]) ?? "",
    seriesType: asString(data["series_type"]) ?? "",
    points,
    currentUnrealizedPnl: asNumber(data["current_unrealized_pnl"]) ?? 0,
    currentTotalPnl: asNumber(data["current_total_pnl"]) ?? 0,
  };
}

function parseArray<T>(
  data: unknown,
  endpoint: string,
  parseItem: (item: unknown, endpoint: string) => T,
): T[] {
  if (!Array.isArray(data)) {
    throw new PredictServerError(
      `Response from ${endpoint} is not an array`,
      { endpoint },
    );
  }
  return data.map((item) => parseItem(item, endpoint));
}

function resolveBaseUrl(explicit?: string): string {
  const url = explicit ?? process.env.NEXT_PUBLIC_PREDICT_SERVER;
  if (typeof url !== "string" || url.length === 0) {
    throw new PredictServerError(
      "NEXT_PUBLIC_PREDICT_SERVER is not set — cannot reach the Predict server",
      { endpoint: "" },
    );
  }
  return url.replace(/\/+$/, "");
}

export interface PredictServerOptions {
  baseUrl?: string;
  fetchImpl?: Fetcher;
}

export function createPredictServerClient(
  options: PredictServerOptions = {},
): PredictServerClient {
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const fetchImpl: Fetcher = options.fetchImpl ?? fetch;

  async function rawRequest(path: string): Promise<Response> {
    const endpoint = `${baseUrl}${path}`;
    try {
      return await fetchImpl(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
    } catch (err) {
      throw new PredictServerError(
        `Network error calling Predict server: ${(err as Error).message}`,
        { endpoint, cause: err },
      );
    }
  }

  async function request<T>(
    path: string,
    parse: (data: unknown, endpoint: string) => T,
  ): Promise<T> {
    const endpoint = `${baseUrl}${path}`;
    const response = await rawRequest(path);

    if (!response.ok) {
      throw new PredictServerError(
        `Predict server returned ${response.status} for ${path}`,
        { endpoint, status: response.status },
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (err) {
      throw new PredictServerError(
        `Failed to parse JSON from Predict server (${path})`,
        { endpoint, cause: err },
      );
    }

    return parse(json, endpoint);
  }

  async function requestNullable<T>(
    path: string,
    parse: (data: unknown, endpoint: string) => T,
  ): Promise<T | null> {
    const endpoint = `${baseUrl}${path}`;
    const response = await rawRequest(path);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new PredictServerError(
        `Predict server returned ${response.status} for ${path}`,
        { endpoint, status: response.status },
      );
    }
    let json: unknown;
    try {
      json = await response.json();
    } catch (err) {
      throw new PredictServerError(
        `Failed to parse JSON from Predict server (${path})`,
        { endpoint, cause: err },
      );
    }
    return parse(json, endpoint);
  }

  const encode = encodeURIComponent;

  return {
    getState(predictId) {
      return request(
        `/predicts/${encode(predictId)}/state`,
        parsePredictState,
      );
    },
    listOracles(predictId) {
      return request(
        `/predicts/${encode(predictId)}/oracles`,
        (data, endpoint) => parseArray(data, endpoint, parseOracle),
      );
    },
    async getOracle(predictId, oracleId) {
      // No per-oracle endpoint exists — filter from the list.
      const list = await this.listOracles(predictId);
      return list.find((o) => o.oracleId === oracleId) ?? null;
    },
    getQuoteAssets(predictId) {
      return request(
        `/predicts/${encode(predictId)}/quote-assets`,
        (data, endpoint) => {
          if (!Array.isArray(data)) {
            throw new PredictServerError(
              `Response from ${endpoint} is not an array of quote asset types`,
              { endpoint },
            );
          }
          return asStringArray(data);
        },
      );
    },
    getVaultSummary(predictId) {
      return request(
        `/predicts/${encode(predictId)}/vault/summary`,
        parseVaultSummary,
      );
    },
    getOracleState(oracleId) {
      return request(
        `/oracles/${encode(oracleId)}/state`,
        parseOracleState,
      );
    },
    getManagerSummary(managerId) {
      return requestNullable(
        `/managers/${encode(managerId)}/summary`,
        parseManagerSummary,
      );
    },
    getManagerPositions(managerId) {
      return request(
        `/managers/${encode(managerId)}/positions/summary`,
        (data, endpoint) => parseArray(data, endpoint, parseManagerPosition),
      );
    },
    getManagerPnl(managerId) {
      return requestNullable(
        `/managers/${encode(managerId)}/pnl`,
        parseManagerPnl,
      );
    },
  };
}
