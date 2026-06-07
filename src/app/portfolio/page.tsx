"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  Briefcase,
  CircleCheckBig,
  Clock,
  Compass,
  ExternalLink,
  FlaskConical,
  Hourglass,
  Inbox,
  Info,
  Lock,
  Pause,
  RefreshCcw,
  Trophy,
  Wallet,
  Wifi,
} from "lucide-react";
import {
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { AppShell } from "@/components/layout/AppShell";
import { ActionButton } from "@/components/ui/ActionButton";
import { CopyableId } from "@/components/ui/CopyableId";
import { useDemoStore } from "@/lib/store/demoStore";
import {
  getManagerOverview,
  listPositions,
  type ManagerOverview,
} from "@/lib/predict/portfolioAdapter";
import {
  getCachedManagerId,
} from "@/lib/sui/predictManagerResolver";
import { getConfiguredManagerId } from "@/lib/sui/predictConfig";
import { redeemPositionTx, withdrawTx } from "@/lib/sui/predictTx";
import { toast } from "@/lib/toast/toastStore";
import type {
  PortfolioPosition,
  PositionStatus,
} from "@/types/predict";

type FilterKey = "all" | "open" | "settled" | "redeemed";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "settled", label: "Settled" },
  { key: "redeemed", label: "Redeemed" },
];

const ORACLE_PRICE_DECIMALS = 9;
const DUSDC_DECIMALS = 6;

function fmtDusdc(value: number): string {
  return `${value.toFixed(2)} DUSDC`;
}

function fmtSignedDusdc(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(2)} DUSDC`;
}

function pnlClass(value: number): string {
  if (value > 0) return "summary-card-value--success";
  if (value < 0) return "summary-card-value--error";
  return "";
}

function strikeText(p: PortfolioPosition): string {
  if (p.marketType === "binary") {
    return p.strike !== undefined ? `$${p.strike.toLocaleString()}` : "—";
  }
  if (p.lowerStrike !== undefined && p.higherStrike !== undefined) {
    return `$${p.lowerStrike.toLocaleString()}–$${p.higherStrike.toLocaleString()}`;
  }
  return "—";
}

function typeText(p: PortfolioPosition): {
  label: string;
  className: string;
} {
  if (p.marketType === "binary") {
    const dir = p.direction ?? "Above";
    return {
      label: `Binary ${dir}`,
      className:
        dir === "Above" ? "position-type--above" : "position-type--below",
    };
  }
  return { label: "Vertical Range", className: "" };
}

function statusBadge(status: PositionStatus): {
  label: string;
  className: string;
  icon: React.ReactNode;
} {
  if (status === "Active") {
    return {
      label: "Open",
      className: "badge--success",
      icon: <Wifi aria-hidden />,
    };
  }
  if (status === "PendingSettlement") {
    return {
      label: "Pending settlement",
      className: "badge--warning",
      icon: <Hourglass aria-hidden />,
    };
  }
  if (status === "Settled") {
    return {
      label: "Settled",
      className: "badge--info",
      icon: <CircleCheckBig aria-hidden />,
    };
  }
  return {
    label: "Redeemed",
    className: "badge--info",
    icon: <Lock aria-hidden />,
  };
}

function countdown(expiryIso: string, now: number): string {
  const t = Date.parse(expiryIso);
  if (!Number.isFinite(t)) return "—";
  const diff = t - now;
  if (diff <= 0) return "expired";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function expiryAbsolute(expiryIso: string): string {
  const d = new Date(expiryIso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function strikeNative(strike: number): bigint {
  return BigInt(Math.round(strike * 10 ** ORACLE_PRICE_DECIMALS));
}

function dusdcToBaseUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** DUSDC_DECIMALS));
}

type ActionResult = {
  digest: string;
  label: string;
};

export default function PortfolioPage() {
  const wallet = useDemoStore((s) => s.wallet);
  const suiClient = useSuiClient();
  const signAndExecute = useSignAndExecuteTransaction();

  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [overview, setOverview] = useState<ManagerOverview | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState<number>(() => Date.now());
  const [refreshTick, setRefreshTick] = useState(0);
  const [results, setResults] = useState<Record<string, ActionResult>>({});

  const managerId = useMemo(() => {
    const cached = wallet.address ? getCachedManagerId(wallet.address) : null;
    return cached ?? getConfiguredManagerId();
  }, [wallet.address]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    if (!managerId) {
      setPositions([]);
      setOverview(null);
      setIsLoading(false);
      return;
    }
    void Promise.all([
      listPositions(managerId),
      getManagerOverview(managerId),
    ])
      .then(([list, ov]) => {
        if (cancelled) return;
        setPositions(list);
        setOverview(ov);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[portfolio] failed to load", err);
        toast.error("Couldn't load portfolio", String(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [managerId, refreshTick]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const refresh = useCallback(() => {
    setRefreshTick((n) => n + 1);
  }, []);

  const dataMode = overview?.dataSource ?? positions[0]?.dataSource ?? "simulated";

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: positions.length,
      open: 0,
      settled: 0,
      redeemed: 0,
    };
    for (const p of positions) {
      if (p.status === "Active" || p.status === "PendingSettlement") c.open += 1;
      else if (p.status === "Settled") c.settled += 1;
      else if (p.status === "Redeemed") c.redeemed += 1;
    }
    return c;
  }, [positions]);

  const filtered = useMemo(() => {
    if (filter === "all") return positions;
    if (filter === "open") {
      return positions.filter(
        (p) => p.status === "Active" || p.status === "PendingSettlement",
      );
    }
    if (filter === "settled") {
      return positions.filter((p) => p.status === "Settled");
    }
    return positions.filter((p) => p.status === "Redeemed");
  }, [positions, filter]);

  const totalCost = positions.reduce((sum, p) => sum + p.cost, 0);
  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalPnl =
    (overview?.realizedPnl ?? 0) +
    (overview?.unrealizedPnl ?? positions.reduce((s, p) => s + p.pnl, 0));
  const openCount = counts.open;
  const settledCount = counts.settled;
  const tradingBalance = overview?.tradingBalance ?? 0;

  // --- Position actions ---

  const onRedeem = useCallback(
    async (p: PortfolioPosition, opts: { permissionless?: boolean } = {}) => {
      if (!managerId) {
        throw new Error("PredictManager not set up — connect wallet first.");
      }
      if (p.marketType === "binary") {
        if (p.strike === undefined || !p.direction) {
          throw new Error("Position is missing strike or direction.");
        }
        const tx = redeemPositionTx({
          kind: "binary",
          managerId,
          oracleId: p.oracleId,
          expiry: BigInt(Date.parse(p.expiry)),
          strike: strikeNative(p.strike),
          direction: p.direction === "Above" ? "up" : "down",
          quantity: BigInt(Math.max(0, Math.floor(p.quantity))),
          permissionless: opts.permissionless,
        });
        const r = await signAndExecute.mutateAsync({
          transaction: tx,
          chain: "sui:testnet",
        });
        setResults((prev) => ({
          ...prev,
          [p.marketId]: {
            digest: r.digest,
            label: opts.permissionless ? "Payout claimed" : "Position redeemed",
          },
        }));
        refresh();
        return;
      }
      if (p.lowerStrike === undefined || p.higherStrike === undefined) {
        throw new Error("Range position is missing strikes.");
      }
      const tx = redeemPositionTx({
        kind: "range",
        managerId,
        oracleId: p.oracleId,
        expiry: BigInt(Date.parse(p.expiry)),
        lowerStrike: strikeNative(p.lowerStrike),
        higherStrike: strikeNative(p.higherStrike),
        quantity: BigInt(Math.max(0, Math.floor(p.quantity))),
      });
      const r = await signAndExecute.mutateAsync({
        transaction: tx,
        chain: "sui:testnet",
      });
      setResults((prev) => ({
        ...prev,
        [p.marketId]: { digest: r.digest, label: "Position redeemed" },
      }));
      refresh();
    },
    [managerId, signAndExecute, refresh],
  );

  const onWithdraw = useCallback(async () => {
    if (!managerId) {
      throw new Error("PredictManager not set up.");
    }
    if (!wallet.address) {
      throw new Error("Connect a wallet first.");
    }
    if (tradingBalance <= 0) {
      throw new Error("Nothing to withdraw — manager balance is 0.");
    }
    const tx = withdrawTx({
      managerId,
      recipient: wallet.address,
      amountBaseUnits: dusdcToBaseUnits(tradingBalance),
    });
    const r = await signAndExecute.mutateAsync({
      transaction: tx,
      chain: "sui:testnet",
    });
    setResults((prev) => ({
      ...prev,
      __withdraw: { digest: r.digest, label: "Withdrawn to wallet" },
    }));
    refresh();
  }, [managerId, wallet.address, tradingBalance, signAndExecute, refresh]);

  // --- Render helpers ---

  const renderEmpty = (
    <div className="portfolio-empty">
      <Inbox aria-hidden style={{ width: 28, height: 28, color: "var(--blue)" }} />
      <p className="portfolio-empty-title">No positions yet</p>
      <p className="portfolio-empty-sub">
        Browse open markets, simulate a position, and sign on the Review step.
      </p>
      <a className="btn btn--primary" href="/markets">
        <Compass aria-hidden />
        Explore markets
      </a>
    </div>
  );

  const renderNoManager = (
    <div className="portfolio-empty">
      <Wallet aria-hidden style={{ width: 28, height: 28, color: "var(--blue)" }} />
      <p className="portfolio-empty-title">No PredictManager yet</p>
      <p className="portfolio-empty-sub">
        Place a position from the Review step first — that one-time signature
        provisions your manager, and positions show up here afterwards.
      </p>
      <a className="btn btn--primary" href="/">
        <Compass aria-hidden />
        Start the flow
      </a>
    </div>
  );

  const renderSkeletons = (
    <div className="position-list">
      <div className="portfolio-skeleton" />
      <div className="portfolio-skeleton" />
      <div className="portfolio-skeleton" />
    </div>
  );

  const withdrawResult = results.__withdraw;

  return (
    <AppShell currentStep={-1}>
      <div className="portfolio-main">
        <header className="portfolio-head">
          <div>
            <h1 className="page-title">
              <Briefcase aria-hidden style={{ verticalAlign: "-3px", marginRight: 8, color: "var(--blue)" }} />
              Portfolio
            </h1>
            <p className="page-sub">
              Open positions, settled payouts, and your PredictManager balance.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {dataMode === "testnet" ? (
              <span className="src-tag src-tag--testnet">
                <Wifi aria-hidden />
                Testnet
              </span>
            ) : (
              <span className="src-tag src-tag--sim">
                <FlaskConical aria-hidden />
                Simulated
              </span>
            )}
            <button
              type="button"
              className="btn btn--ghost"
              onClick={refresh}
              aria-label="Refresh"
            >
              <RefreshCcw aria-hidden />
              Refresh
            </button>
          </div>
        </header>

        {/* Summary cards */}
        <section className="portfolio-summary" aria-label="Portfolio summary">
          <div className="summary-card">
            <span className="summary-card-label">
              <Wifi aria-hidden /> Open positions
            </span>
            <span className="summary-card-value">{openCount}</span>
            <span className="summary-card-sub">
              {overview?.awaitingSettlementPositions ?? 0} awaiting settlement
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-card-label">
              <CircleCheckBig aria-hidden /> Settled
            </span>
            <span className="summary-card-value">{settledCount}</span>
            <span className="summary-card-sub">
              {counts.redeemed} already redeemed
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-card-label">
              <Trophy aria-hidden /> Total cost
            </span>
            <span className="summary-card-value">{fmtDusdc(totalCost)}</span>
            <span className="summary-card-sub">across all positions</span>
          </div>
          <div className="summary-card">
            <span className="summary-card-label">
              <Trophy aria-hidden /> Current value
            </span>
            <span className="summary-card-value">{fmtDusdc(totalValue)}</span>
            <span className="summary-card-sub">mark-to-market</span>
          </div>
          <div className="summary-card">
            <span className="summary-card-label">
              <Trophy aria-hidden /> Total PnL
            </span>
            <span className={`summary-card-value ${pnlClass(totalPnl)}`}>
              {fmtSignedDusdc(totalPnl)}
            </span>
            <span className="summary-card-sub">
              realized {fmtSignedDusdc(overview?.realizedPnl ?? 0)}
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-card-label">
              <Wallet aria-hidden /> Withdrawable
            </span>
            <span className="summary-card-value">{fmtDusdc(tradingBalance)}</span>
            <span className="summary-card-sub">in your PredictManager</span>
            <ActionButton
              className="summary-card-withdraw"
              variant="secondary"
              leading={<ArrowDownToLine aria-hidden />}
              disabled={!managerId || !wallet.address || tradingBalance <= 0}
              onAction={onWithdraw}
              loadingToast={{
                title: "Awaiting signature…",
                description: "Approve the withdrawal in your wallet.",
              }}
              successToast={{ title: "Withdrawn to wallet" }}
              errorToast={{ title: "Withdraw failed" }}
            >
              Withdraw to wallet
            </ActionButton>
            {withdrawResult && (
              <a
                className="position-result-link"
                href={`https://suiscan.xyz/testnet/tx/${withdrawResult.digest}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: 0, marginTop: 4 }}
              >
                View tx
                <ExternalLink aria-hidden />
              </a>
            )}
          </div>
        </section>

        {/* Filter tabs */}
        <div className="portfolio-tabs" role="tablist" aria-label="Filter positions">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={`portfolio-tab${filter === f.key ? " is-active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="portfolio-tab-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>

        {/* Position list */}
        {!managerId ? (
          renderNoManager
        ) : isLoading ? (
          renderSkeletons
        ) : filtered.length === 0 ? (
          renderEmpty
        ) : (
          <div className="position-list">
            {filtered.map((p) => {
              const t = typeText(p);
              const badge = statusBadge(p.status);
              const result = results[p.marketId];
              const canRedeem = p.status === "Active" && p.quantity > 0;
              const canClaim = p.status === "Settled" && p.quantity > 0;
              const isDone =
                p.status === "Redeemed" || (p.quantity === 0 && !canClaim);
              return (
                <article key={p.marketId} className="position-card">
                  <div>
                    <div className="position-row1">
                      <span className="position-asset">{p.asset}</span>
                      <span className={`position-type ${t.className}`}>
                        {t.label}
                      </span>
                      <span className={`badge ${badge.className}`}>
                        {badge.icon}
                        {badge.label}
                      </span>
                    </div>

                    <div className="position-stats">
                      <div>
                        <p className="position-stat-label">Strike</p>
                        <p className="position-stat-value">{strikeText(p)}</p>
                      </div>
                      <div>
                        <p className="position-stat-label">Quantity</p>
                        <p className="position-stat-value">
                          {p.quantity.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="position-stat-label">Cost</p>
                        <p className="position-stat-value">{fmtDusdc(p.cost)}</p>
                      </div>
                      <div>
                        <p className="position-stat-label">Current value</p>
                        <p className="position-stat-value">
                          {fmtDusdc(p.currentValue)}
                        </p>
                      </div>
                      <div>
                        <p className="position-stat-label">PnL</p>
                        <p
                          className={`position-stat-value ${
                            p.pnl > 0
                              ? "position-stat-value--success"
                              : p.pnl < 0
                                ? "position-stat-value--error"
                                : ""
                          }`}
                        >
                          {fmtSignedDusdc(p.pnl)}
                        </p>
                      </div>
                      <div>
                        <p className="position-stat-label">Expiry</p>
                        <p className="position-stat-value">
                          {expiryAbsolute(p.expiry)}
                        </p>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                      <span className="position-expiry">
                        <Clock aria-hidden />
                        {p.status === "Active"
                          ? `${countdown(p.expiry, now)} left`
                          : p.status === "PendingSettlement"
                            ? "awaiting settlement"
                            : p.status === "Settled" && p.settlementPrice !== undefined
                              ? `settled @ $${p.settlementPrice.toLocaleString()}`
                              : "closed"}
                      </span>
                      <span className="position-oracle">
                        Oracle
                        <CopyableId
                          value={p.oracleId}
                          ariaLabel={`Copy oracle ${p.oracleId}`}
                        />
                      </span>
                    </div>
                  </div>

                  <div className="position-side">
                    <div className="position-side-actions">
                      {canClaim ? (
                        <ActionButton
                          variant="primary"
                          leading={<Trophy aria-hidden />}
                          onAction={() =>
                            onRedeem(p, { permissionless: true })
                          }
                          loadingToast={{
                            title: "Awaiting signature…",
                            description: "Approve the claim in your wallet.",
                          }}
                          successToast={{ title: "Payout claimed" }}
                          errorToast={{ title: "Claim failed" }}
                        >
                          Claim payout
                        </ActionButton>
                      ) : canRedeem ? (
                        <ActionButton
                          variant="primary"
                          leading={<ArrowDownToLine aria-hidden />}
                          onAction={() => onRedeem(p)}
                          loadingToast={{
                            title: "Awaiting signature…",
                            description: "Approve the redeem in your wallet.",
                          }}
                          successToast={{ title: "Position redeemed" }}
                          errorToast={{ title: "Redeem failed" }}
                        >
                          Redeem
                        </ActionButton>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--ghost"
                          disabled
                          aria-disabled
                        >
                          <Lock aria-hidden />
                          {isDone ? "Redeemed" : "Locked"}
                        </button>
                      )}
                      {p.status === "PendingSettlement" && (
                        <p className="position-oracle" style={{ justifyContent: "flex-end" }}>
                          <Hourglass aria-hidden />
                          settlement pending
                        </p>
                      )}
                      {p.status === "Active" && (
                        <p className="position-oracle" style={{ justifyContent: "flex-end" }}>
                          <Info aria-hidden />
                          {p.direction === "Above" ? "wins if above strike" : "wins if below strike"}
                        </p>
                      )}
                    </div>
                  </div>

                  {result && (
                    <div className="position-result-card" role="status">
                      <CircleCheckBig aria-hidden />
                      <span>
                        {result.label} ·{" "}
                        <span style={{ fontFamily: "var(--mono)" }}>
                          {result.digest.slice(0, 10)}…{result.digest.slice(-6)}
                        </span>
                      </span>
                      <a
                        className="position-result-link"
                        href={`https://suiscan.xyz/testnet/tx/${result.digest}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View on Suiscan
                        <ExternalLink aria-hidden />
                      </a>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {!wallet.connected && (
          <p
            style={{
              marginTop: 20,
              fontSize: 13,
              color: "var(--muted)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Pause aria-hidden style={{ width: 14, height: 14 }} />
            Connect a wallet to redeem positions or withdraw to your wallet.
          </p>
        )}
      </div>
    </AppShell>
  );
}
