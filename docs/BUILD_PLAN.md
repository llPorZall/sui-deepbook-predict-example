# PredictFlow — BUILD_PLAN.md (as-built)

Status legend: ✓ done · ◐ verify / in progress · ☐ to do
Source of truth for requirements: `docs/PRD.md` (v2, as-built).

## Status summary
Core app, design, and the three on-chain integrations (DeepBook Predict mint, Sui Payment Kit,
on-chain bounded budget) are built and producing real testnet transactions. Remaining work is
mostly verification + demo hardening. Dependency order: 0 → 1 → 2 → 3 → 4 → (4.7 / 4.8 / 4.9) →
5 → 6 → 7 → 8.

---

## Phase 0 — Environment & scaffold ✓
- [x] Claude Code installed + authenticated
- [x] Next.js (App Router, TS strict, Tailwind, src/)
- [x] Deps: @mysten/dapp-kit, @mysten/sui, @mysten/slush-wallet, @tanstack/react-query, zustand
- [x] shadcn (Nova / Radix) for behavior-only primitives
- [x] Vitest + Playwright

## Phase 1 — Project config ✓
- [x] `docs/PRD.md` in repo (now v2)
- [x] `CLAUDE.md` (consolidated; predictflow.css = frozen design system; tokens; AI guardrails)
- [x] `docs/BUILD_PLAN.md` (this file)
- [x] `types/` from PRD §14
- [x] `data/demoMarkets.json` + `demoVaults.json`
- [x] Slash commands (`/build-screen`, `/review`, `/demo-check`)
- [x] Review subagents (security, compliance, a11y)

## Phase 2 — Design foundation ✓
- [x] Designed in Claude Design → handoff bundle
- [x] Ported `predictflow.css` (frozen design system) → `src/app/`
- [x] Ported `AppShell.tsx` (sticky nav + stepper + footer) → `src/components/layout/`
- [x] `logo.svg` + `icon.svg` in `public/`; favicon wired
- [x] Fonts via next/font (Inter + JetBrains Mono → `--sans` / `--mono`)
- [x] Foundation smoke test (shell renders)

## Phase 3 — Screens (visual, mock first) ✓
- [x] Connect (`app/page.tsx`)
- [x] Wallet Dashboard (`app/dashboard/`)
- [x] Budget (`app/budget/`)
- [x] Pay + Receipt (`app/payment/`)
- [x] Markets + Research (`app/markets/`)
- [x] Simulate + Range (`app/simulate/`)
- [x] Final Review (`app/review/`)

## Phase 4 — Core logic ✓
- [x] `lib/predict/simulator.ts` (binary + range, validation, labeled)
- [x] `lib/predict/predictAdapter.ts` (Mock default + Testnet source + auto-fallback)
- [x] `lib/payment/{createPaymentIntent,createReceipt,duplicateProtection}.ts`
- [x] `lib/store/demoStore.ts` (Zustand + resetDemo)
- [x] Wallet integration (dApp Kit, Slush, network badge, error states)
- [x] `lib/agent/{mockResearch,guardrails}.ts` (deterministic, guardrailed; AI kept)

## Phase 4.7 — DeepBook Predict (live testnet) ✓
- [x] Requested DUSDC + testnet SUI
- [x] `predictConfig.ts` (real addresses) + `predictServer.ts` (read layer)
- [x] Real `TestnetPredictSource` (markets/oracles/vault from server)
- [x] Market model corrected: market = oracle + expiry (no per-market strike); strike from
      min_strike/tick; decimals (price 9, DUSDC 6)
- [x] `predictTx.ts` mint / mint_range (PTB)
- [x] Live preview via `get_trade_amounts` / `get_range_trade_amounts`
- [x] Real mint tx verified on explorer

## Phase 4.8 — Sui Payment (Payment Kit) ✓
- [x] Payment Kit SDK + `payKitConfig.ts`
- [x] `PaymentRegistry` created (one-time) — id in env
- [x] `suiPaymentTx.ts` (process_registry_payment, DUSDC)
- [x] Wired into payment flow; on-chain `PaymentReceipt` + explorer link
- [x] Duplicate protection mapped to composite PaymentKey + EDuplicatePayment handling

## Phase 4.9 — On-chain bounded budget ✓
- [x] AgentPolicy: budgetId, capAmount, feePerPrediction, expiry
- [x] Budget step = cap (authorize), fixed fee per prediction
- [x] `onchainBudget.ts` (spent/remaining from on-chain; per-prediction dup nonce)
- [x] One PTB per prediction: fee (Payment Kit) + deposit + mint (atomic, one digest)
- [x] Budget meter UI + per-prediction cost + "already placed · free"
- [x] Reopen reads on-chain → resume without re-charge

## Phase 5 — Portfolio ✓
- [x] `portfolioAdapter.ts` + server reads (positions / pnl / summary)
- [x] `predictTx.ts` redeem / redeem_range / redeem_permissionless / withdraw
- [x] `app/portfolio/` page (summary, filters, position cards, PnL, status)
- [x] Redeem / Claim + Withdraw to wallet; empty state; data-source tag
- [x] "Portfolio" nav link (outside the stepper)

## Phase 6 — Wallet disconnect ✓
- [x] Wallet-chip dropdown (address+copy, network, explorer, balances, Disconnect)
- [x] Disconnect on Wallet Dashboard card
- [x] On disconnect: clear local state, return to Connect; on reconnect reload on-chain state

## Phase 7 — Verification & corrections ◐
- [x] Market model fix (oracle+expiry, no per-market strike)
- [x] Simulator consistency (binary + range inherit selected market; BTC, not SUI)
- [x] Live-action gate on Review (testnet + wallet + balances)
- [x] Review reads real data (no SUI/$5/MKT_0x mock)
- [ ] ◐ **Position sizing fix** — quote→quantity via get_trade_amounts; deposit matches cost+fee
      (avoid dust positions / stranded funds). VERIFY a real mint shows non-trivial cost.
- [ ] ◐ Mock-leakage audit pass (no "demo USDC" / hardcoded SUI / 1.8x in testnet branch)
- [ ] ◐ `/review` board: security / compliance / a11y all PASS

## Phase 8 — Demo hardening ☐
- [ ] ☐ One-key reset / presenter mode (keeps wallet connected)
- [ ] ☐ Local mock-wallet mode (no extension) as live fallback
- [ ] ☐ Pre-run both real txs → keep known-good digests + open suiscan tabs
- [ ] ☐ Backup demo video + screenshots
- [ ] ☐ Top up DUSDC + SUI gas before the event
- [ ] ☐ Final `/demo-check` pass

---

## Before-demo definition of done
- [ ] Markets / Simulate / Review / Portfolio show real BTC/USD testnet data (no mock leakage)
- [ ] One real Payment Kit payment on the explorer (non-dust amount)
- [ ] One real DeepBook Predict mint on the explorer (non-dust cost)
- [ ] Bounded budget verified on-chain; reopen resumes correctly
- [ ] Portfolio shows the position; redeem works
- [ ] AI summary safe/advice-free; Preview-only is default; simulated fallback works
- [ ] Full flow completes in < 10 min

## Top priority next
1. **Phase 7 position-sizing fix** (the one open correctness item from tx verification).
2. Mock-leakage audit + `/review`.
3. Phase 8 hardening (reset, mock-wallet fallback, backup video).