# PredictFlow — Build Plan

Maps PRD §19 (Build Phases) into a checkable, dependency-aware task list. Tasks
with the same `(parallel: group-N)` label can run concurrently. Constitution
rule: every change must keep `pnpm typecheck` and `pnpm build` green.

Legend
- `[ ]` = todo · `[x]` = done · `[~]` = in progress
- `→ depends on` = predecessor tasks that must complete first
- `(parallel: group-N)` = safe to run alongside other group-N tasks

---

## Dependency graph (high level)

```
P0 Scaffold
  ├─► P1 Design Prototype (out-of-repo, optional reference)
  └─► P2 Frontend MVP ──┬─► P3 Wallet Integration ──┬─► P4 Testnet Tx (optional)
                       │                            │
                       └─► P5 Predict Adapter ──────┴─► P6 Demo Polish
```

Phase order is strict: P2 must precede P3/P5; P3 must precede P4; P4/P5 must
precede P6. Within each phase, tasks marked `(parallel: …)` are independent.

---

## P0 — Scaffold (this task)

- [x] T0.1 Read PRD.md and write BUILD_PLAN.md
- [x] T0.2 Add `typecheck` script to package.json
- [x] T0.3 Create folder skeleton from PRD §13 under `src/`
- [x] T0.4 Create TypeScript types from PRD §14 in `src/types/`
- [x] T0.5 `pnpm typecheck` passes

---

## P1 — Design Prototype  *(out-of-repo / reference only)*

- [ ] T1.1 Figma: landing + wallet mock  (parallel: design)
- [ ] T1.2 Figma: payment intent + receipt  (parallel: design)
- [ ] T1.3 Figma: market dashboard  (parallel: design)
- [ ] T1.4 Figma: binary + range simulator  (parallel: design)
- [ ] T1.5 Figma: final review screen  (parallel: design)

→ depends on: P0

---

## P2 — Frontend MVP (simulated mode, no wallet)

### P2.A — Foundations  (parallel: p2-foundations)
- [ ] T2.1 Tailwind tokens: wire PRD §16.3 colors into `globals.css` as CSS vars
- [ ] T2.2 Fonts: load Inter + JetBrains Mono via `next/font`
- [ ] T2.3 AppShell + Header + Footer (layout/) with Demo Mode badge + disclaimer
- [ ] T2.4 Stepper component (Connect → Budget → Pay → Explore → Simulate → Review)
- [ ] T2.5 Session store (Zustand): currentStep, walletState, paymentIntent, receipt, selectedMarket, simulationResult, agentPolicy
- [ ] T2.6 Seed `data/demoMarkets.json` and `data/demoVaults.json`

### P2.B — Lib (pure logic, no UI)  (parallel: p2-lib)  → depends on: P2.A T2.5
- [ ] T2.7 `lib/payment/createPaymentIntent.ts`
- [ ] T2.8 `lib/payment/createReceipt.ts`
- [ ] T2.9 `lib/payment/duplicateProtection.ts` (key = `wallet-purpose-date`)
- [ ] T2.10 `lib/predict/mockMarkets.ts` (load demoMarkets.json)
- [ ] T2.11 `lib/predict/predictAdapter.ts` (default mode: `"simulated"`; live fallback hook reserved)
- [ ] T2.12 `lib/predict/simulator.ts` (binary §15.1 + range §15.2 logic, labeled simplified)
- [ ] T2.13 `lib/agent/guardrails.ts` (banned-word filter: buy/sell/guaranteed/safe bet/sure thing/win/profit/"you should")
- [ ] T2.14 `lib/agent/mockResearch.ts` (deterministic template; passes guardrails)

### P2.C — Pages + components  → depends on: P2.A, P2.B
- [ ] T2.15 Landing `/` (parallel: p2-pages)
- [ ] T2.16 Budget setup `/dashboard` → BudgetSetupCard (parallel: p2-pages)
- [ ] T2.17 Payment intent preview `/payment` → PaymentIntentPreview (parallel: p2-pages)
- [ ] T2.18 Receipt screen → ReceiptCard, export JSON (parallel: p2-pages)
- [ ] T2.19 Markets `/markets` → MarketCard, MarketStatusBadge, OracleLifecycle, VaultSummaryCard (parallel: p2-pages)
- [ ] T2.20 Simulate `/simulate` → BinarySimulator, RangeSimulator, PayoffPreview (parallel: p2-pages)
- [ ] T2.21 Review `/review` → checklist + CTAs (default "Preview Only") (parallel: p2-pages)
- [ ] T2.22 Agent panel → AgentPolicyCard, ResearchSummaryCard (parallel: p2-pages)
- [ ] T2.23 Demo reset action

### P2.D — Tests
- [ ] T2.24 Vitest: simulator binary + range edge cases (parallel: p2-tests)
- [ ] T2.25 Vitest: guardrails banned-word filter (parallel: p2-tests)
- [ ] T2.26 Vitest: duplicate protection key (parallel: p2-tests)
- [ ] T2.27 Playwright: full happy-path stepper

→ depends on: P0

---

## P3 — Wallet Integration (Slush via dApp Kit)

- [ ] T3.1 `lib/sui/client.ts` — SuiClient configured for testnet
- [ ] T3.2 `lib/sui/wallet.ts` — dApp Kit providers in root layout
- [ ] T3.3 ConnectWalletButton states: Not connected / Connecting / Connected / Error
- [ ] T3.4 WalletStatusCard: shortened address + provider
- [ ] T3.5 NetworkBadge: Testnet (success) / Mainnet (warning) / Unknown (error) / Not connected (neutral)
- [ ] T3.6 Wire walletState into session store; gate payment step on connection
- [ ] T3.7 Vitest: shortenAddress + network detection

→ depends on: P2 complete

---

## P4 — Testnet Transaction *(optional)*

- [ ] T4.1 `lib/sui/transactions.ts` — build minimal testnet transfer tx
- [ ] T4.2 Sign + execute via dApp Kit; capture txDigest
- [ ] T4.3 Attach txDigest to receipt; render explorer link
- [ ] T4.4 Failure handling: surface user-rejected / RPC error without losing intent
- [ ] T4.5 Playwright: signature-stubbed flow

→ depends on: P3 complete · constitution: must keep simulated fallback default

---

## P5 — DeepBook Predict Integration

- [ ] T5.1 Extend `predictAdapter.ts` with `live` mode behind feature flag
- [ ] T5.2 Live market fetch (parallel: p5-live)
- [ ] T5.3 Live vault summary fetch (parallel: p5-live)
- [ ] T5.4 Per-call simulated fallback (no live call without fallback)
- [ ] T5.5 `dataSource` badge on every card sourced from adapter
- [ ] T5.6 Vitest: adapter falls back when live throws

→ depends on: P2 complete (independent of P3/P4; can run parallel to P3 after P2)

---

## P6 — Demo Polish

- [ ] T6.1 Loading + error states across all pages  (parallel: p6)
- [ ] T6.2 Reset button audit  (parallel: p6)
- [ ] T6.3 Presenter-mode key bindings / overlay  (parallel: p6)
- [ ] T6.4 Mobile + tablet pass  (parallel: p6)
- [ ] T6.5 Copy review against AI guardrails + safety language
- [ ] T6.6 Acceptance checklist from PRD §21 walkthrough

→ depends on: P2 + (P3 or P4 or P5 — whichever ship)

---

## Parallel-execution cheatsheet

| Group label        | Can run together                                                 |
|--------------------|------------------------------------------------------------------|
| `design`           | All P1 Figma tasks                                               |
| `p2-foundations`   | T2.1, T2.2, T2.3, T2.4, T2.5, T2.6                               |
| `p2-lib`           | T2.7–T2.14 (after store + adapter shape exist)                   |
| `p2-pages`         | T2.15–T2.22 (after lib + foundations)                            |
| `p2-tests`         | T2.24–T2.26                                                      |
| `p5-live`          | T5.2, T5.3                                                       |
| `p6`               | T6.1–T6.4                                                        |

## Constitution gates (apply to every task)
- All market/vault reads through `lib/predict/predictAdapter.ts`, default `"simulated"`.
- No keys/secrets/seeds in localStorage — receipts only.
- Final financial actions require explicit user signature; review-screen default CTA = "Preview Only".
- AI panel must pass `lib/agent/guardrails.ts`.
- `pnpm typecheck` + `pnpm build` green before marking a task done.
