"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CircleAlert,
  CircleCheckBig,
  CircleMinus,
  Clock,
  Compass,
  FlaskConical,
  Hourglass,
  Info,
  ListChecks,
  Lock,
  Pause,
  TriangleAlert,
  Vault,
  Wifi,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getPredictSource } from "@/lib/predict/predictAdapter";
import {
  toDisplayMarket,
  type DisplayMarket,
  type DisplayOracle,
} from "@/lib/predict/marketDisplay";
import { useDemoStore, DEMO_STEPS } from "@/lib/store/demoStore";
import { generateResearch } from "@/lib/agent/mockResearch";
import { ActionButton } from "@/components/ui/ActionButton";
import { CopyableId } from "@/components/ui/CopyableId";
import { toast } from "@/lib/toast/toastStore";
import type { PredictMarket, VaultSummary } from "@/types/predict";

const VAULT_ID = "VLT_USDC_MAIN";

function OracleBadge({ status }: { status: DisplayOracle }) {
  if (status === "active") {
    return (
      <span className="oracle-badge oracle-badge--active">
        <Wifi aria-hidden />
        Active
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="oracle-badge oracle-badge--pending">
        <Hourglass aria-hidden />
        Pending Settlement
      </span>
    );
  }
  if (status === "inactive") {
    return (
      <span className="oracle-badge oracle-badge--inactive">
        <Pause aria-hidden />
        Inactive
      </span>
    );
  }
  return (
    <span className="oracle-badge oracle-badge--settled">
      <CircleCheckBig aria-hidden />
      Settled
    </span>
  );
}

function ExpiryDisplay({ market }: { market: DisplayMarket }) {
  if (market.status === "active") {
    return (
      <span className="mc-expiry">
        <Clock aria-hidden />
        <span className="mc-countdown">{market.countdown}</span>
        {market.expiryAbsolute && (
          <>
            <span className="mc-expiry-sep" aria-hidden>
              ·
            </span>
            <span className="mc-expiry-abs">expires {market.expiryAbsolute}</span>
          </>
        )}
      </span>
    );
  }
  if (market.status === "pending") {
    return (
      <span className="mc-expiry mc-expiry--closed">
        <Lock aria-hidden />
        {market.countdown}
      </span>
    );
  }
  if (market.status === "inactive") {
    return (
      <span className="mc-expiry mc-expiry--closed">
        <CircleMinus aria-hidden />
        {market.countdown}
      </span>
    );
  }
  return (
    <span className="mc-expiry mc-expiry--closed">
      <Check aria-hidden />
      {market.countdown}
    </span>
  );
}

function formatVaultUnit(value: string): string {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : value;
}

export default function MarketsPage() {
  const router = useRouter();
  const selectedMarket = useDemoStore((s) => s.selectedMarket);
  const setSelectedMarket = useDemoStore((s) => s.setSelectedMarket);
  const setCurrentStep = useDemoStore((s) => s.setCurrentStep);

  const [markets, setMarkets] = useState<PredictMarket[]>([]);
  const [vault, setVault] = useState<VaultSummary | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadProgress, setLoadProgress] = useState<number>(0);

  useEffect(() => {
    setCurrentStep(DEMO_STEPS.markets);
  }, [setCurrentStep]);

  useEffect(() => {
    const source = getPredictSource();
    let cancelled = false;
    setIsLoading(true);
    setLoadProgress(8);

    // Indeterminate-feeling progress that creeps to ~90% until the fetch resolves.
    const tick = window.setInterval(() => {
      setLoadProgress((p) => (p < 90 ? p + Math.max(1, Math.round((92 - p) / 8)) : p));
    }, 180);

    void Promise.all([source.listMarkets(), source.getVault(VAULT_ID)])
      .then(([m, v]) => {
        if (cancelled) return;
        setMarkets(m);
        setVault(v);
        if (!selectedMarket && m.length > 0) {
          setSelectedMarket(m[0]);
        }
        setLoadProgress(100);
      })
      .finally(() => {
        if (cancelled) return;
        window.clearInterval(tick);
        // Let the 100% bar render briefly before hiding.
        window.setTimeout(() => {
          if (!cancelled) setIsLoading(false);
        }, 220);
      });

    return () => {
      cancelled = true;
      window.clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const displayMarkets = useMemo(
    () => markets.map((m) => toDisplayMarket(m, now)),
    [markets, now],
  );

  const research = useMemo(
    () => (selectedMarket ? generateResearch(selectedMarket) : null),
    [selectedMarket],
  );

  const selectedId = selectedMarket?.marketId ?? displayMarkets[0]?.id ?? "";
  const selected =
    displayMarkets.find((m) => m.id === selectedId) ?? displayMarkets[0];

  const liveCount = displayMarkets.filter((m) => m.status === "active").length;
  const utilPct = vault
    ? Math.round(Number(vault.utilizationRate) * 100)
    : 0;

  return (
    <AppShell currentStep={DEMO_STEPS.markets}>
      {isLoading && (
        <div
          className="page-loader"
          role="status"
          aria-live="polite"
          aria-label="Loading markets"
        >
          <div className="page-loader-row">
            <span className="page-loader-spin" aria-hidden>
              <Compass />
            </span>
            <span className="page-loader-text">Loading markets…</span>
            <span className="page-loader-pct">{loadProgress}%</span>
          </div>
          <div
            className="page-loader-bar"
            role="progressbar"
            aria-valuenow={loadProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="page-loader-fill"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
        </div>
      )}
      {/* =================== MARKETS =================== */}
      <header className="page-head page-head--row">
        <div>
          <h1 className="page-title">Open markets</h1>
          <p className="page-sub">
            DeepBook Predict-style markets. Select one to inspect its oracle status.
          </p>
        </div>
        <span className="market-count">
          <Compass aria-hidden />
          <span>
            <b>{displayMarkets.length}</b>&nbsp;markets · {liveCount} live
          </span>
        </span>
      </header>

      <div className="explore-grid">
        <section className="markets-grid" aria-label="Open markets">
          {displayMarkets.map((m) => {
            const isSelected = m.id === selectedId;
            return (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                className={`market-card${isSelected ? " is-selected" : ""}`}
                aria-pressed={isSelected}
                onClick={() => {
                  const raw = markets.find((mm) => mm.marketId === m.id);
                  if (raw) {
                    setSelectedMarket(raw);
                    toast.info("Market selected", raw.marketId);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    const raw = markets.find((mm) => mm.marketId === m.id);
                    if (raw) {
                      setSelectedMarket(raw);
                      toast.info("Market selected", raw.marketId);
                    }
                  }
                }}
              >
                <div className="mc-row1">
                  <div className="mc-meta">
                    <span
                      className={
                        m.type === "binary"
                          ? "type-badge type-badge--binary"
                          : "type-badge type-badge--range"
                      }
                    >
                      {m.type === "binary" ? "Binary" : "Vertical Range"}
                    </span>
                    {m.strikePending && (
                      <span className="mc-pending">strike pending</span>
                    )}
                  </div>
                  {m.source === "testnet" ? (
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
                </div>

                <div className="mc-asset">
                  <span className="asset-ico" aria-hidden>
                    {m.assetGlyph}
                  </span>
                  <span className="mc-primary">{m.primaryLine}</span>
                </div>

                {m.oraclePriceText && (
                  <div className="mc-oracle-price">
                    <span className="mc-oracle-cap">Oracle price</span>
                    <span className="mc-oracle-val">{m.oraclePriceText}</span>
                  </div>
                )}

                <div className="mc-id-row">
                  <CopyableId value={m.id} ariaLabel={`Copy market ID ${m.id}`} />
                </div>

                <div className="mc-foot">
                  <ExpiryDisplay market={m} />
                  <OracleBadge status={m.status} />
                </div>
              </div>
            );
          })}
        </section>

        <aside className="aside">
          {/* Vault summary */}
          <div className="vault-card">
            <div className="vault-head">
              <Vault aria-hidden />
              <p>Vault summary</p>
            </div>
            <div className="vault-stats">
              <div>
                <p className="vstat-label">Total liquidity</p>
                <p className="vstat-val">
                  {vault ? formatVaultUnit(vault.totalLiquidity) : "—"}{" "}
                  <span className="unit">{vault?.quoteAsset ?? "USDC"}</span>
                </p>
              </div>
              <div>
                <p className="vstat-label">Liabilities</p>
                <p className="vstat-val">
                  {vault ? formatVaultUnit(vault.liabilities) : "—"}{" "}
                  <span className="unit">{vault?.quoteAsset ?? "USDC"}</span>
                </p>
              </div>
              <div>
                <p className="vstat-label">Max payout</p>
                <p className="vstat-val">
                  {vault ? formatVaultUnit(vault.maxPayout) : "—"}{" "}
                  <span className="unit">{vault?.quoteAsset ?? "USDC"}</span>
                </p>
              </div>
              <div>
                <p className="vstat-label">Open markets</p>
                <p className="vstat-val">{liveCount}</p>
              </div>
            </div>
            <div className="util-block">
              <div className="util-top">
                <span>Utilization</span>
                <span className="util-pct">{utilPct}%</span>
              </div>
              <div
                className="util-bar"
                role="progressbar"
                aria-valuenow={utilPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="util-fill" style={{ width: `${utilPct}%` }} />
              </div>
            </div>
          </div>

          {/* Oracle status legend + selected explainer */}
          <div className="oracle-panel">
            <p className="op-title">Oracle status</p>
            <div className="legend-list">
              <div className="legend-row">
                <span className="oracle-badge oracle-badge--inactive">
                  <Pause aria-hidden />
                  Inactive
                </span>
              </div>
              <div className="legend-row">
                <span className="oracle-badge oracle-badge--active">
                  <Wifi aria-hidden />
                  Active
                </span>
              </div>
              <div className="legend-row">
                <span className="oracle-badge oracle-badge--pending">
                  <Hourglass aria-hidden />
                  Pending Settlement
                </span>
              </div>
              <div className="legend-row">
                <span className="oracle-badge oracle-badge--settled">
                  <CircleCheckBig aria-hidden />
                  Settled
                </span>
              </div>
            </div>
            <div className="op-divider" />
            <p className="op-selected-cap">Selected market</p>
            {selected && (
              <>
                <div className="op-selected-head">
                  <CopyableId
                    value={selected.id}
                    className="op-selected-id"
                    ariaLabel={`Copy selected market ID ${selected.id}`}
                  />
                  <OracleBadge status={selected.status} />
                </div>
                <p className="op-explain">{selected.explain}</p>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* =================== FLOW DIVIDER =================== */}
      <div className="flow-divider" role="separator">
        <span className="flow-divider-label">
          <Check aria-hidden />
          Research summary
          {selected && (
            <CopyableId
              value={selected.id}
              className="flow-divider-id"
              ariaLabel={`Copy market ID ${selected.id}`}
            />
          )}
        </span>
      </div>

      {/* =================== RESEARCH =================== */}
      <div className="research-main">
        <header className="research-head">
          <div className="head-row">
            <span className="ai-mark" aria-hidden>
              <Compass />
            </span>
            <div>
              <h2 className="page-title">AI research summary</h2>
              <p className="page-meta">
                Bounded agent
                {selected && (
                  <>
                    <span aria-hidden>·</span>
                    <CopyableId
                      value={selected.id}
                      className="page-meta-id"
                      ariaLabel={`Copy market ID ${selected.id}`}
                    />
                  </>
                )}
                {research && (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      generated{" "}
                      {new Date(research.generatedAt)
                        .toISOString()
                        .slice(11, 16)}{" "}
                      UTC
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="scope-note">
            <Info aria-hidden />
            Descriptive analysis only. This summary explains the market — it does
            not recommend any action.
          </div>
        </header>

        <section className="research-card">
          <header className="research-context-head">
            <div className="research-market">
              <span className="research-market-pair">
                {selected?.assetName ?? ""}
              </span>
              {selected && (
                <CopyableId
                  value={selected.id}
                  className="research-market-id"
                  ariaLabel={`Copy market ID ${selected.id}`}
                />
              )}
            </div>
            <span className="oracle-badge oracle-badge--active">
              <Wifi aria-hidden />
              Oracle Active
            </span>
          </header>

          {/* Market Context */}
          <div className="sec">
            <div className="sec-label">
              <span className="sec-ico sec-ico--ctx" aria-hidden>
                <BookOpen />
              </span>
              <h3 className="sec-name">Market Context</h3>
            </div>
            <p className="sec-body">{research?.context ?? ""}</p>
            {research && <p className="sec-body">{research.payoff}</p>}
          </div>

          {/* Risk Notes */}
          <div className="sec">
            <div className="sec-label">
              <span className="sec-ico sec-ico--risk" aria-hidden>
                <TriangleAlert />
              </span>
              <h3 className="sec-name">Risk Notes</h3>
            </div>
            <ul className="risk-list">
              {(research?.risks ?? []).map((r, i) => {
                const Icon = [CircleAlert, Clock, Vault, FlaskConical][i] ?? CircleAlert;
                return (
                  <li key={r.title}>
                    <Icon aria-hidden />
                    <span>
                      <b>{r.title}.</b> {r.body}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* What to Verify */}
          <div className="sec">
            <div className="sec-label">
              <span className="sec-ico sec-ico--verify" aria-hidden>
                <ListChecks />
              </span>
              <h3 className="sec-name">What to Verify</h3>
            </div>
            <p className="sec-body sec-body--lede">
              Before any real transaction, confirm each of the following
              independently:
            </p>
            <ul className="verify-list">
              {(research?.toVerify ?? []).map((v) => (
                <li key={v.title}>
                  <Check aria-hidden />
                  <span>
                    <b>{v.title}</b> — {v.body}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Final-action reminder */}
          <div className="reminder">
            <span className="reminder-ico" aria-hidden>
              <Lock />
            </span>
            <div>
              <h3>Final-action reminder</h3>
              <p>{research?.finalReminder ?? ""}</p>
            </div>
          </div>
        </section>

        <div className="cta-row">
          <ActionButton
            variant="secondary"
            leading={<ArrowLeft aria-hidden />}
            onAction={() => {
              if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            loadingToast={false}
            successToast={false}
          >
            Back to markets
          </ActionButton>
          <ActionButton
            variant="primary"
            trailing={<Zap aria-hidden />}
            disabled={!selected}
            onAction={() => router.push("/simulate")}
            loadingToast={{ title: "Opening simulator…" }}
            successToast={{ title: "Simulator ready", description: selected?.id }}
            errorToast={{ title: "Couldn't open simulator" }}
          >
            Open simulator
          </ActionButton>
        </div>
      </div>
    </AppShell>
  );
}
