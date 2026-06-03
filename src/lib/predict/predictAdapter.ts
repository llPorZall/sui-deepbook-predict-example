import type {
  OracleStatus,
  PredictMarket,
  VaultSummary,
} from "@/types/predict";
import demoMarkets from "@/data/demoMarkets.json";
import demoVaults from "@/data/demoVaults.json";
import { getPredictConfig } from "@/lib/sui/predictConfig";
import {
  createPredictServerClient,
  type OracleStateDto,
  type OracleSummary,
  type PredictServerClient,
  type VaultSummaryDto,
} from "./predictServer";

export type DataMode = "simulated" | "testnet";

export const TESTNET_PREDICT_PACKAGE = "predict-testnet-4-16" as const;

const ORACLE_STATUS_MAP: Record<string, OracleStatus> = {
  inactive: "Inactive",
  active: "Active",
  pending: "PendingSettlement",
  pending_settlement: "PendingSettlement",
  pendingsettlement: "PendingSettlement",
  settled: "Settled",
};

function mapOracleStatus(raw: string): OracleStatus {
  const key = raw.toLowerCase().replace(/[\s-]+/g, "_");
  return ORACLE_STATUS_MAP[key] ?? "Inactive";
}

// Quote asset comes back from the Predict server as a fully-qualified Move
// type like `…::dusdc::DUSDC`. The UI just needs the symbol.
function quoteTypeToSymbol(type: string | undefined): string {
  if (!type) return "USDC";
  const parts = type.split("::");
  return parts[parts.length - 1] || type;
}

function msToIso(ms: number): string {
  return new Date(ms).toISOString();
}

// DUSDC has 6 decimals on testnet — the server returns base units.
const DUSDC_DECIMALS = 6;
function fromDusdcBase(base: number): string {
  return (base / 10 ** DUSDC_DECIMALS).toString();
}

// Oracle prices (min_strike, tick_size, settlement_price) are scaled by 1e9.
// e.g. BTC strike "50000000000000" = $50,000.
const ORACLE_PRICE_DECIMALS = 9;
function fromOraclePrice(scaled: number | null | undefined): number | undefined {
  if (typeof scaled !== "number" || !Number.isFinite(scaled)) return undefined;
  return scaled / 10 ** ORACLE_PRICE_DECIMALS;
}

// Demo screens render 3–6 cards per section (CLAUDE.md). Cap the live list so
// thousands of expiries don't drown the UI.
const MAX_TESTNET_MARKETS = 6;

function oracleToMarket(
  oracle: OracleSummary,
  quoteAsset: string,
  state: OracleStateDto | null,
): PredictMarket {
  // The Predict server's oracle summary describes a *family* of binary
  // contracts at strikes `min_strike + n * tick_size` — there is no
  // canonical per-market strike on this endpoint. Strike + direction are
  // chosen at trade time on the simulate page; we surface the live oracle
  // price and the strike grid (minStrike + tickSize) instead.
  const oraclePrice = fromOraclePrice(state?.latestSpotPrice);
  return {
    marketId: oracle.oracleId,
    asset: `${oracle.underlyingAsset} / USD`,
    quoteAsset,
    marketType: "binary",
    expiry: msToIso(oracle.expiryMs),
    oracleStatus: mapOracleStatus(oracle.status),
    lastOraclePrice: oraclePrice ?? fromOraclePrice(oracle.settlementPrice),
    oraclePrice,
    minStrike: fromOraclePrice(oracle.minStrike),
    tickSize: fromOraclePrice(oracle.tickSize),
    settlementPrice: fromOraclePrice(oracle.settlementPrice),
    dataSource: "testnet",
  };
}

function vaultDtoToSummary(
  dto: VaultSummaryDto,
  quoteAsset: string,
): VaultSummary {
  const totalLiquidity = dto.vaultValue;
  const maxPayout = dto.totalMaxPayout;
  const liabilities = Math.max(0, totalLiquidity - dto.availableLiquidity);
  return {
    // Server has one vault per predict object — surface predict id as vault id.
    vaultId: dto.predictId,
    quoteAsset,
    totalLiquidity: fromDusdcBase(totalLiquidity),
    liabilities: fromDusdcBase(liabilities),
    maxPayout: fromDusdcBase(maxPayout),
    utilizationRate: dto.utilization.toFixed(4),
    plpSharePrice: dto.plpSharePrice.toString(),
    dataSource: "testnet",
  };
}

export interface PredictSource {
  readonly mode: DataMode;
  listMarkets(): Promise<PredictMarket[]>;
  getMarket(marketId: string): Promise<PredictMarket | null>;
  getVault(vaultId: string): Promise<VaultSummary | null>;
}

export class MockPredictSource implements PredictSource {
  readonly mode: DataMode = "simulated";

  private readonly markets: PredictMarket[];
  private readonly vaults: VaultSummary[];

  constructor(
    markets: PredictMarket[] = demoMarkets as PredictMarket[],
    vaults: VaultSummary[] = demoVaults as VaultSummary[],
  ) {
    this.markets = markets;
    this.vaults = vaults;
  }

  async listMarkets(): Promise<PredictMarket[]> {
    return this.markets;
  }

  async getMarket(marketId: string): Promise<PredictMarket | null> {
    return this.markets.find((m) => m.marketId === marketId) ?? null;
  }

  async getVault(vaultId: string): Promise<VaultSummary | null> {
    return this.vaults.find((v) => v.vaultId === vaultId) ?? null;
  }
}

export class TestnetPredictSource implements PredictSource {
  readonly mode: DataMode = "testnet";
  readonly packageId = TESTNET_PREDICT_PACKAGE;

  private readonly explicitClient?: PredictServerClient;
  private readonly explicitPredictId?: string;
  private cachedClient?: PredictServerClient;
  private cachedPredictId?: string;
  private cachedQuoteAsset?: string;

  constructor(client?: PredictServerClient, predictId?: string) {
    // Resolve env lazily — if NEXT_PUBLIC_PREDICT_* is missing the call
    // throws inside an async method, where FallbackPredictSource can catch it.
    this.explicitClient = client;
    this.explicitPredictId = predictId;
  }

  private resolveClient(): PredictServerClient {
    if (this.cachedClient) return this.cachedClient;
    this.cachedClient = this.explicitClient ?? createPredictServerClient();
    return this.cachedClient;
  }

  private resolvePredictId(): string {
    if (this.cachedPredictId) return this.cachedPredictId;
    this.cachedPredictId =
      this.explicitPredictId ?? getPredictConfig().predictObjectId;
    return this.cachedPredictId;
  }

  private async resolveQuoteAsset(): Promise<string> {
    if (this.cachedQuoteAsset !== undefined) return this.cachedQuoteAsset;
    const quoteAssets = await this.resolveClient().getQuoteAssets(
      this.resolvePredictId(),
    );
    const symbol = quoteTypeToSymbol(quoteAssets[0]);
    this.cachedQuoteAsset = symbol;
    return symbol;
  }

  async listMarkets(): Promise<PredictMarket[]> {
    const client = this.resolveClient();
    const predictId = this.resolvePredictId();
    const [quoteAsset, oracles] = await Promise.all([
      this.resolveQuoteAsset(),
      client.listOracles(predictId),
    ]);
    // Only surface oracles that can actually be traded, soonest-expiring first,
    // and cap so the demo grid doesn't drown in thousands of rows.
    const tradable = oracles
      .filter((o) => mapOracleStatus(o.status) === "Active")
      .sort((a, b) => a.expiryMs - b.expiryMs)
      .slice(0, MAX_TESTNET_MARKETS);
    // Fetch the latest spot price for each tradable oracle in parallel —
    // the list endpoint doesn't include it. A single per-oracle failure
    // should not blank out the whole grid.
    const states = await Promise.all(
      tradable.map(async (o) => {
        try {
          return await client.getOracleState(o.oracleId);
        } catch {
          return null;
        }
      }),
    );
    return tradable.map((o, i) => oracleToMarket(o, quoteAsset, states[i] ?? null));
  }

  async getMarket(marketId: string): Promise<PredictMarket | null> {
    const client = this.resolveClient();
    const predictId = this.resolvePredictId();
    const [quoteAsset, oracle] = await Promise.all([
      this.resolveQuoteAsset(),
      client.getOracle(predictId, marketId),
    ]);
    if (!oracle) return null;
    let state: OracleStateDto | null = null;
    try {
      state = await client.getOracleState(marketId);
    } catch {
      state = null;
    }
    return oracleToMarket(oracle, quoteAsset, state);
  }

  async getVault(_vaultId: string): Promise<VaultSummary | null> {
    // The predict object has exactly one vault on testnet, so we return it
    // regardless of the vaultId argument the demo page passes in.
    const client = this.resolveClient();
    const predictId = this.resolvePredictId();
    const [quoteAsset, dto] = await Promise.all([
      this.resolveQuoteAsset(),
      client.getVaultSummary(predictId),
    ]);
    return vaultDtoToSummary(dto, quoteAsset);
  }
}

function resolveDataMode(): DataMode {
  const raw = process.env.NEXT_PUBLIC_DATA_MODE;
  return raw === "testnet" ? "testnet" : "simulated";
}

function createSource(mode: DataMode): PredictSource {
  return mode === "testnet" ? new TestnetPredictSource() : new MockPredictSource();
}

/**
 * Wraps a primary source so any thrown error transparently falls back to mock data.
 * Required by CLAUDE.md: live RPC must never run without an automatic simulated fallback.
 */
class FallbackPredictSource implements PredictSource {
  readonly mode: DataMode;
  private readonly primary: PredictSource;
  private readonly fallback: PredictSource;

  constructor(primary: PredictSource, fallback: PredictSource) {
    this.primary = primary;
    this.fallback = fallback;
    this.mode = primary.mode;
  }

  private async run<T>(
    fn: (source: PredictSource) => Promise<T>,
  ): Promise<T> {
    try {
      return await fn(this.primary);
    } catch (err) {
      // Surface why testnet data is being silently replaced with mocks —
      // otherwise misconfigured endpoints look identical to "demo data" on screen.
      console.warn(
        "[predictAdapter] testnet source failed, falling back to mock:",
        err,
      );
      return fn(this.fallback);
    }
  }

  listMarkets(): Promise<PredictMarket[]> {
    return this.run((s) => s.listMarkets());
  }

  getMarket(marketId: string): Promise<PredictMarket | null> {
    return this.run((s) => s.getMarket(marketId));
  }

  getVault(vaultId: string): Promise<VaultSummary | null> {
    return this.run((s) => s.getVault(vaultId));
  }
}

export function getPredictSource(mode: DataMode = resolveDataMode()): PredictSource {
  if (mode === "simulated") {
    return new MockPredictSource();
  }
  return new FallbackPredictSource(createSource("testnet"), new MockPredictSource());
}
