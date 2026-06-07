import type {
  PortfolioPosition,
  PositionStatus,
} from "@/types/predict";
import {
  createPredictServerClient,
  type ManagerPositionDto,
  type ManagerSummaryDto,
  type PredictServerClient,
} from "./predictServer";
import type { DataMode } from "./predictAdapter";

// Oracle prices (strike, mark_price, settlement_price) are scaled by 1e9.
const ORACLE_PRICE_DECIMALS = 9;
// DUSDC has 6 decimals — server amounts (cost, mark value) are base units.
const DUSDC_DECIMALS = 6;

function fromOraclePrice(scaled: number): number {
  return scaled / 10 ** ORACLE_PRICE_DECIMALS;
}

function fromDusdcBase(base: number): number {
  return base / 10 ** DUSDC_DECIMALS;
}

const POSITION_STATUS_MAP: Record<string, PositionStatus> = {
  active: "Active",
  pending: "PendingSettlement",
  pending_settlement: "PendingSettlement",
  pendingsettlement: "PendingSettlement",
  settled: "Settled",
  redeemed: "Redeemed",
};

function mapPositionStatus(raw: string): PositionStatus {
  const key = raw.toLowerCase().replace(/[\s-]+/g, "_");
  return POSITION_STATUS_MAP[key] ?? "Active";
}

function dtoToPosition(
  dto: ManagerPositionDto,
  dataMode: DataMode,
): PortfolioPosition {
  return {
    marketId: dto.oracleId,
    oracleId: dto.oracleId,
    asset: `${dto.underlyingAsset} / USD`,
    marketType: "binary",
    direction: dto.isUp ? "Above" : "Below",
    strike: fromOraclePrice(dto.strike),
    expiry: new Date(dto.expiryMs).toISOString(),
    quantity: dto.openQuantity,
    cost: fromDusdcBase(dto.openCostBasis),
    currentValue: fromDusdcBase(dto.markValue),
    pnl: fromDusdcBase(dto.unrealizedPnl),
    status: mapPositionStatus(dto.status),
    dataSource: dataMode,
  };
}

export type ManagerOverview = {
  managerId: string;
  /** Free DUSDC inside the manager — what the user can withdraw to the wallet. */
  tradingBalance: number;
  /** Locked in open positions. */
  openExposure: number;
  /** Total value (trading balance + mark-to-market of open positions). */
  accountValue: number;
  /** Realized PnL across all positions (DUSDC). */
  realizedPnl: number;
  /** Unrealized PnL on open positions (DUSDC). */
  unrealizedPnl: number;
  openPositions: number;
  awaitingSettlementPositions: number;
  dataSource: DataMode;
};

function fromDusdcOverview(dto: ManagerSummaryDto, mode: DataMode): ManagerOverview {
  return {
    managerId: dto.managerId,
    tradingBalance: fromDusdcBase(dto.tradingBalance),
    openExposure: fromDusdcBase(dto.openExposure),
    accountValue: fromDusdcBase(dto.accountValue),
    realizedPnl: fromDusdcBase(dto.realizedPnl),
    unrealizedPnl: fromDusdcBase(dto.unrealizedPnl),
    openPositions: dto.openPositions,
    awaitingSettlementPositions: dto.awaitingSettlementPositions,
    dataSource: mode,
  };
}

export interface PositionSource {
  readonly mode: DataMode;
  listPositions(managerId: string): Promise<PortfolioPosition[]>;
  getManagerOverview(managerId: string): Promise<ManagerOverview | null>;
}

export class MockPositionSource implements PositionSource {
  readonly mode: DataMode = "simulated";

  private readonly fixture: PortfolioPosition[];

  constructor(fixture: PortfolioPosition[] = DEMO_POSITIONS) {
    this.fixture = fixture;
  }

  async listPositions(_managerId: string): Promise<PortfolioPosition[]> {
    return this.fixture;
  }

  async getManagerOverview(managerId: string): Promise<ManagerOverview | null> {
    const open = this.fixture.filter((p) => p.status === "Active").length;
    const pending = this.fixture.filter(
      (p) => p.status === "PendingSettlement",
    ).length;
    const exposure = this.fixture
      .filter((p) => p.status === "Active")
      .reduce((sum, p) => sum + p.cost, 0);
    const unrealized = this.fixture.reduce((sum, p) => sum + p.pnl, 0);
    return {
      managerId,
      tradingBalance: 2.883688,
      openExposure: exposure,
      accountValue: 2.883688 + exposure + unrealized,
      realizedPnl: -0.001796,
      unrealizedPnl: unrealized,
      openPositions: open,
      awaitingSettlementPositions: pending,
      dataSource: "simulated",
    };
  }
}

export class TestnetPositionSource implements PositionSource {
  readonly mode: DataMode = "testnet";

  private readonly explicitClient?: PredictServerClient;
  private cachedClient?: PredictServerClient;

  constructor(client?: PredictServerClient) {
    this.explicitClient = client;
  }

  private resolveClient(): PredictServerClient {
    if (this.cachedClient) return this.cachedClient;
    this.cachedClient = this.explicitClient ?? createPredictServerClient();
    return this.cachedClient;
  }

  async listPositions(managerId: string): Promise<PortfolioPosition[]> {
    const dtos = await this.resolveClient().getManagerPositions(managerId);
    return dtos.map((d) => dtoToPosition(d, "testnet"));
  }

  async getManagerOverview(managerId: string): Promise<ManagerOverview | null> {
    const dto = await this.resolveClient().getManagerSummary(managerId);
    return dto ? fromDusdcOverview(dto, "testnet") : null;
  }
}

class FallbackPositionSource implements PositionSource {
  readonly mode: DataMode;
  private readonly primary: PositionSource;
  private readonly fallback: PositionSource;

  constructor(primary: PositionSource, fallback: PositionSource) {
    this.primary = primary;
    this.fallback = fallback;
    this.mode = primary.mode;
  }

  async listPositions(managerId: string): Promise<PortfolioPosition[]> {
    try {
      return await this.primary.listPositions(managerId);
    } catch (err) {
      console.warn(
        "[portfolioAdapter] testnet source failed, falling back to mock:",
        err,
      );
      return this.fallback.listPositions(managerId);
    }
  }

  async getManagerOverview(managerId: string): Promise<ManagerOverview | null> {
    try {
      return await this.primary.getManagerOverview(managerId);
    } catch (err) {
      console.warn(
        "[portfolioAdapter] testnet summary failed, falling back to mock:",
        err,
      );
      return this.fallback.getManagerOverview(managerId);
    }
  }
}

function resolveDataMode(): DataMode {
  const raw = process.env.NEXT_PUBLIC_DATA_MODE;
  return raw === "testnet" ? "testnet" : "simulated";
}

export function getPositionSource(
  mode: DataMode = resolveDataMode(),
): PositionSource {
  if (mode === "simulated") {
    return new MockPositionSource();
  }
  return new FallbackPositionSource(
    new TestnetPositionSource(),
    new MockPositionSource(),
  );
}

export function listPositions(managerId: string): Promise<PortfolioPosition[]> {
  return getPositionSource().listPositions(managerId);
}

export function getManagerOverview(
  managerId: string,
): Promise<ManagerOverview | null> {
  return getPositionSource().getManagerOverview(managerId);
}

// Demo fixture — used when NEXT_PUBLIC_DATA_MODE=simulated and as the fallback
// when the live server is unreachable.
const DEMO_POSITIONS: PortfolioPosition[] = [
  {
    marketId: "demo-btc-above-60k",
    oracleId: "demo-btc-above-60k",
    asset: "BTC / USD",
    marketType: "binary",
    direction: "Above",
    strike: 60000,
    expiry: "2026-06-21T00:00:00.000Z",
    quantity: 2_000_000,
    cost: 1.585968,
    currentValue: 1.942893,
    pnl: 0.356925,
    status: "Active",
    dataSource: "simulated",
  },
];
