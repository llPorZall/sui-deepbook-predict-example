# Project Requirement Document — PredictFlow (v2, as-built)

**Sui Payment + DeepBook Predict Demo DApp**

> v2 reflects what was actually built and verified on Sui Testnet (real transactions on the
> explorer), evolving from the original simulated SUI concept. Built 100% with Claude Design
> (UI/UX) → handoff → Claude Code (development + testing).

---

## 1. Project Summary

- **Project Name:** PredictFlow
- **Tagline:** Pay for market access. Predict on-chain. Decide with confidence.
- **Format:** Web Application Demo
- **Target Network:** Sui Testnet (real on-chain) with an automatic Simulated fallback
- **Underlying market:** BTC / USD (DeepBook Predict, laddered ~15-min expiries)
- **Quote asset:** DUSDC (DeepBook Predict testnet stablecoin)
- **Wallet:** Slush Wallet (via Sui Wallet Standard / dApp Kit)
- **Primary Audience:** Builders, developers, students, non-technical Web3 participants
- **Presentation Context:** ON THE MOVE / Road to Sui Overflow 2026

PredictFlow composes three Sui primitives into one product flow:
1. **Sui Payment (Payment Kit)** — real on-chain payment with payment intent, receipt object, and on-chain duplicate prevention.
2. **DeepBook Predict** — oracle-priced, expiry-based binary and vertical-range positions, minted on-chain.
3. **Agentic Commerce (bounded budget)** — a user-authorized spending cap; an agent prepares research/intents within it, but every final financial action requires the user's signature.

Key change from v1: the demo now produces **real testnet transactions** (Payment Kit payment + DeepBook Predict mint) visible on the explorer, not only simulated data.

---

## 2. Core Demo Narrative

A user connects Slush Wallet (Sui Testnet), authorizes a small **research budget cap**, explores
live **BTC/USD** DeepBook Predict markets, previews a binary or range position priced by the real
oracle, then places a prediction. Placing a prediction is **one signed PTB** that pays a fixed
research fee (Payment Kit) and mints the position (DeepBook Predict) atomically — producing a
**real digest on the explorer**. The user can later review positions and redeem in the Portfolio.

**Key message:** Sui's composable primitives (Payment, DeepBook Predict, user-controlled agent
policy) let builders ship a real on-chain product where payment, market data, prediction,
receipts, and approval are one smooth experience.

---

## 3. Positioning

Educational prototype + builder showcase, **not** a production trading or gambling product.
- **Avoid:** gambling framing, sports/political markets, guaranteed-profit or advice language.
- **Present as:** a builder showcase, a real on-chain payment + prediction demo, a bounded-agent
  example, a research/markets workflow.
- **UI disclaimer:** "Demo on Sui Testnet. Educational prototype. Not financial advice."

---

## 4. Objectives

### 4.1 Product
Connect Slush; authorize a bounded research budget; browse live BTC/USD markets; preview a
position with real oracle pricing; place a prediction on-chain (one signed PTB); get a receipt;
review and redeem positions in a Portfolio.

### 4.2 Demo
Show the audience: Sui Payment is more than a transfer (intent + receipt + on-chain dup
prevention); DeepBook Predict is a reusable on-chain market primitive; a bounded agent policy
keeps the user in control; **real transactions happen on testnet and are verifiable on the explorer**.

### 4.3 Technical
A clean foundation for: wallet connect/disconnect + network detection; reading market/vault/
position data from the Predict server; a real Payment Kit payment; a real DeepBook Predict
mint/redeem; an on-chain-verified bounded budget; clean separation of UI data vs on-chain action;
and automatic simulated fallback for stability.

---

## 5. Scope

### 5.1 In Scope
Landing/connect; Slush connect + disconnect; wallet status + network detection; **research budget
cap (on-chain allowance)**; **real Payment Kit payment** (research fee); receipt; BTC/USD market
dashboard (oracle lifecycle, vault summary); binary + vertical-range simulators with **real
get_trade_amounts pricing** (testnet) and a simplified fallback (simulated); **real DeepBook
Predict mint** (one atomic PTB with the payment); final review with Preview-only/Live-action;
**Portfolio** (positions, PnL, redeem, withdraw); demo reset; responsive design; simulated
fallback throughout.

### 5.2 Out of Scope
Mainnet; real-money/fiat; production custody/risk engine; KYC/KYB; sports/political markets;
unlimited agent authority; LP/vault management UI (PLP supply/withdraw) beyond read-only summary.

---

## 6. Product Name
**PredictFlow** (unchanged).

---

## 7. User Personas
Builder/Developer; Student/First-time builder; Non-technical Web3 participant (unchanged from v1).

---

## 8. High-Level User Journey

1. **Connect** — Slush on Sui Testnet; show address, network, disconnect available.
2. **Budget (cap)** — authorize a research budget cap (e.g., 5 DUSDC). Fee per prediction is
   fixed (1 DUSDC). Spending happens per prediction, not upfront. Remaining is verified on-chain.
3. **Explore (Markets)** — live BTC/USD markets (a market = an oracle + expiry; strike is chosen
   later by the user). Each card shows current oracle price, expiry (15-min ladder), oracle
   status, vault summary.
4. **Simulate** — pick direction + strike (>= min_strike, tick-stepped) or a range band; preview
   cost/payout/max-loss via real `get_trade_amounts` (testnet) or a simplified formula (simulated).
5. **Place prediction** — one signed PTB: pay the 1 DUSDC fee (Payment Kit) + deposit + mint the
   position (DeepBook Predict), atomically → real digest on the explorer. Same prediction is
   dup-protected (no double charge).
6. **Review** — Preview-only by default; Live action (real on-chain) when on testnet with wallet
   + balances. Shows the real market, receipt, and position.
7. **Portfolio** — all minted positions, status, PnL, results; redeem/claim and withdraw to wallet.

---

## 9. Core Pages and Screens

- **9.1 Landing / Connect** — hero, three feature cards, connect Slush, testnet disclaimer.
- **9.2 Wallet Dashboard** — connected wallet card (address, network, balances DUSDC/SUI),
  **Disconnect** button; 5 error states (not installed / rejected / wrong network / no account /
  timeout).
- **9.3 Research Budget Cap** — set cap (default 5 DUSDC), fixed fee per prediction (1 DUSDC,
  read-only), expiry, "= N predictions available". Authorizes spend up to cap; money moves per
  prediction. Remaining verified on-chain.
- **9.4 Payment Intent / per-prediction** — the research fee is bundled into the prediction PTB
  (Payment Kit). Intent preview shows amount, asset (DUSDC), purpose, recipient (merchant),
  duplicate-protection key.
- **9.5 Receipt** — real `PaymentReceipt` fields (receiptId/nonce, amount, asset, recipient,
  timestamp, tx digest, network), copy/export JSON, explorer link.
- **9.6 Market Dashboard (BTC/USD)** — market cards (asset, current oracle price, expiry +
  countdown, oracle status, truncated oracleId with copy + explorer); vault summary; oracle
  lifecycle legend. **No per-market strike** (strike is user-chosen).
- **9.7 AI Research Summary** — deterministic, template-based (NOT an LLM) summary keyed to the
  selected market: market context, risk notes, what to verify, final-action reminder.
  Guardrailed: never emits buy/sell/guaranteed/safe-bet/win/profit/"you should".
- **9.8 Binary Simulator** — asset BTC/USD (inherited), direction, strike (>= min_strike,
  tick-stepped, default near spot), expiry (inherited), quote amount. Outputs from real
  `get_trade_amounts` (testnet) / simplified formula (simulated), labeled accordingly.
- **9.9 Vertical Range Simulator** — lower/higher strike (both >= min_strike, tick-stepped,
  lower<higher, band around spot), dynamic band visualization scaled to BTC; outputs from real
  `get_range_trade_amounts` (testnet) / simplified (simulated).
- **9.10 Final Review** — completed checklist; Preview-only (default) vs Live action (gated by
  testnet mode + wallet + DUSDC/gas); shows real market, receipt, position; reset.
- **9.11 Portfolio (NEW)** — summary (open/settled counts, total cost/value, PnL, withdrawable
  manager balance); filter tabs (All/Open/Settled/Redeemed); position cards (asset, type, strike(s),
  expiry, quantity, cost, current value, PnL, status badge, oracleId); per-position Redeem/Claim;
  Withdraw to wallet; empty state; simulated fallback + data-source tag.

---

## 10. Functional Requirements

- **10.1 Wallet** — connect Slush via Wallet Standard / dApp Kit; show shortened address, network;
  warn off-testnet; **disconnect** (wallet-chip dropdown in nav + Wallet Dashboard button);
  reconnect reloads on-chain budget/positions.
- **10.2 Network** — default sui:testnet; warn/prevent live actions on unsupported networks;
  simulated mode always available.
- **10.3 Bounded budget (on-chain allowance)** — set a cap; each prediction deducts a fixed fee;
  remaining computed from on-chain Payment Kit history; deterministic per-prediction nonce
  (`pf-<wallet>-<budgetId>-<marketId>`) → same prediction is free (dup-protected); reopen resumes
  without re-authorizing if remaining > 0 and not expired.
- **10.4 Sui Payment (Payment Kit)** — `process_registry_payment` (DUSDC) to the merchant via a
  `PaymentRegistry`; emits a `PaymentReceipt`; composite `PaymentKey` prevents duplicate payment;
  receipt copyable/exportable; explorer link.
- **10.5 Market dashboard** — list live BTC/USD oracles (markets) with price, expiry, oracle
  status, vault summary; data source Testnet/Simulated; select to inspect.
- **10.6 Oracle lifecycle** — Inactive / Active / Pending Settlement / Settled badges with
  explanations; block mint if not Active; countdown.
- **10.7 Binary simulator** — direction, strike (min_strike/tick), quote→quantity conversion;
  real pricing via `get_trade_amounts`; explains winning condition, max loss, oracle/expiry dep.
- **10.8 Range simulator** — lower/higher strike validated; real pricing via
  `get_range_trade_amounts`; band visualization; payoff/risk explained.
- **10.9 Place prediction (mint)** — one PTB: split DUSDC → Payment Kit fee + manager deposit +
  `market_key::new` + `predict::mint`/`mint_range`; **quantity derived from the quote amount via
  get_trade_amounts** (not raw); deposit matches cost + fee (no stranded funds); emits
  `PositionMinted`; real digest.
- **10.10 AI research** — deterministic template keyed to the market; guardrail function blocks
  banned words; no LLM in MVP.
- **10.11 Agentic policy** — cap, allowed recipient (merchant), purpose, expiry, fee per
  prediction, final action requires user signature; agent prepares, never auto-executes.
- **10.12 Portfolio + redeem** — read positions/PnL/summary from the Predict server; redeem
  (`redeem`/`redeem_range`/`redeem_permissionless`) → payout to manager; `withdraw` to wallet;
  show settled win/loss (loss = expired without payout).
- **10.13 Demo reset** — clears local session; on-chain budget/positions persist and reload.

---

## 11. Non-Functional Requirements
- **Performance:** fast load; dashboard < 2s with cached/mock data; loading states for on-chain reads.
- **Reliability:** automatic simulated fallback if the Predict server/RPC is unavailable; never crash.
- **Security:** never request seed phrase; never auto-submit; always show recipient + amount before
  signing; final action requires user signature; no secrets in localStorage.
- **Compliance/Safety:** testnet disclaimer; no profit/advice/guarantee language; descriptive PnL only.
- **Accessibility:** strong contrast; large tap targets; status badges use icon + label, not color alone.

---

## 12. Technical Architecture

### 12.1 Stack
Next.js (App Router) · TypeScript strict · Tailwind · **predictflow.css design system (frozen,
from Claude Design handoff)** + `AppShell` · @mysten/dapp-kit · @mysten/sui · @mysten/slush-wallet
(web wallet) · Payment Kit TS SDK · @tanstack/react-query · Zustand · lucide-react · Vitest ·
Playwright. shadcn/Radix used only for behavior-only primitives (DropdownMenu, etc.).

### 12.2 Data modes
- **Simulated (default):** static JSON, simplified payoff, local receipts — for stability/fallback.
- **Testnet:** Predict server reads + Payment Kit + DeepBook Predict on Sui Testnet, real digests.
- Toggle via `NEXT_PUBLIC_DATA_MODE` / `NEXT_PUBLIC_PAYMENT_MODE`; testnet auto-falls back to
  simulated on error.

### 12.3 Decimals / scaling
- Price & strike: **9 decimals** (min_strike 50000000000000 = $50,000; tick 1000000000 = $1).
- DUSDC: **6 decimals** (1 DUSDC = 1,000,000).
- Expiry: unix ms.

### 12.4 Per-prediction transaction (one PTB)
`SplitCoins(DUSDC)` → `payment_kit::process_registry_payment` (fee) → `predict_manager::deposit`
→ `market_key::new` → `predict::mint`/`mint_range`. Atomic; one digest.

---

## 13. Folder Structure (as-built)
```
app/  page.tsx · dashboard/ · budget/ · payment/ · markets/ · simulate/ · review/ · portfolio/
      layout.tsx (next/font + predictflow.css) · icon.svg
components/ layout/{AppShell,Header,Footer} · wallet/ · payment/ · markets/ · simulator/ · agent/ · portfolio/
lib/  sui/{client,wallet,predictTx,predictConfig}  payment/{createPaymentIntent,createReceipt,duplicateProtection,payKitConfig,suiPaymentTx}
      predict/{predictServer,predictAdapter,portfolioAdapter,simulator,mockMarkets}
      agent/{mockResearch,guardrails}  budget/{onchainBudget}  store/{demoStore}  utils/{format}
data/ demoMarkets.json · demoVaults.json
types/ payment.ts · predict.ts · wallet.ts · agent.ts
app/styles predictflow.css  ·  public/{logo.svg,icon.svg}
```

---

## 14. Core Data Models (updated)

```typescript
type WalletState = { connected: boolean; address?: string; walletName?: string;
  network?: "sui:testnet" | "sui:mainnet" | "unknown"; };

// Market = oracle + expiry (NO fixed strike; strike is user-chosen)
type PredictMarket = {
  marketId: string;          // oracle_id
  asset: string;             // "BTC/USD"
  quoteAsset: string;        // DUSDC
  expiry: string;            // unix ms / ISO
  oracleStatus: "Inactive" | "Active" | "PendingSettlement" | "Settled";
  oraclePrice?: number;      // current spot (/10^9)
  minStrike: number;         // /10^9
  tickSize: number;          // /10^9
  settlementPrice?: number;
  dataSource: "testnet" | "simulated";
};

type Position = {
  oracleId: string; asset: string; kind: "binary" | "range";
  direction?: "above" | "below"; strike?: number; lowerStrike?: number; higherStrike?: number;
  expiry: string; quantity: number; cost: number; currentValue?: number; pnl?: number;
  status: "Active" | "PendingSettlement" | "Settled" | "Redeemed"; settlementPrice?: number;
};

type AgentPolicy = {
  policyId: string; budgetId: string; walletAddress: string;
  capAmount: string; feePerPrediction: string;   // fixed (e.g., 1 DUSDC)
  asset: string; allowedRecipient: string; purpose: string; expiry: string;
  finalActionRequiresUserSignature: true;         // remaining/used derived on-chain
};

type Receipt = {                                   // mirrors PaymentKit PaymentReceipt
  receiptId: string; nonce: string; walletAddress: string; recipient: string;
  amount: string; asset: string; purpose: string; timestamp: string; network: string;
  txDigest?: string; status: "paid" | "simulated" | "failed";
};

type VaultSummary = { vaultId: string; quoteAsset: string; totalLiquidity: string;
  liabilities: string; maxPayout: string; utilizationRate: string; dataSource: "testnet" | "simulated"; };
```

---

## 15. Pricing / Simulation Logic
- **Simulated mode:** simplified payoff (binary ~1.8x, range ~2.2x) clearly labeled "Simplified
  simulation".
- **Testnet mode:** real oracle pricing via `get_trade_amounts` / `get_range_trade_amounts`
  (devInspect), labeled "Live testnet preview". The **quote amount (DUSDC to spend) is converted to
  the correct mint quantity** using the returned ask price (decimals applied); cost shown from the
  real result.

---

## 16. Design Requirements
- **Source of truth:** `predictflow.css` (frozen, from the Claude Design handoff) + `AppShell`
  (sticky nav + stepper + footer). All visual components use its classes; shadcn for behavior only.
- **Tokens:** Primary `#298DFF` · Navy `#081C2E` · Ink `#0B2438` · Muted `#647584` · Card `#EEF7FF`
  · Border `#D8EAFE` · Bg `#FFFFFF` · Success `#1A9B6C` · Warning `#D99A00` · Error `#D94A4A`;
  tints (success/warning/error); geometry `--r-card 16px`, `--r-control 10px`, `--maxw 1120px`.
- **Type:** Inter (headings 600-700, body 400-500), JetBrains Mono (labels/addresses/numerics).
- **Principles:** one idea per screen; 3-5 cards/section; icon+label badges; clear CTA; readable on
  a projector. Stepper: Connect → Budget → Pay → Explore → Simulate → Review (Portfolio is a
  separate nav item).

---

## 17. Key UI Components
Connect/Disconnect (wallet-chip dropdown: address+copy, network, explorer, balances, Disconnect in
`--error`); Demo Mode badge; Network badge; Market status badge (4 oracle states); **Budget meter**
(remaining/cap, predictions left, expiry, from on-chain); Receipt card; Agent policy card;
Simulator result card (Live testnet preview / Simplified simulation); Portfolio position card +
Redeem/Withdraw.

---

## 18. Demo Script (BTC + real on-chain)
Connect Slush (testnet) → authorize a 5 DUSDC research budget cap → explore live BTC/USD markets →
preview a binary position priced by the real oracle → place the prediction (one signature pays the
fee + mints on-chain → show the digest on suiscan) → Portfolio shows the position → (optional)
redeem. Closing: "Sui Payment + DeepBook Predict + a bounded agent policy = a real on-chain product,
verifiable on the explorer."

---

## 19. Build History (as delivered)
1. Design in **Claude Design** → handoff bundle → ported to `predictflow.css` + `AppShell`.
2. Config + types + mock data; foundation wiring (next/font, CSS, favicon).
3. 10 screens built from the handoff (mock data first).
4. Logic: simulator, predictAdapter, payment/receipt, Zustand store, wallet, AI panel.
5. **Phase 4.7** — live DeepBook Predict testnet (markets, mint, real pricing).
6. **Phase 4.8** — real Sui Payment via Payment Kit.
7. **Phase 4.9** — bounded budget as an on-chain allowance (cap + per-prediction fee, one PTB).
8. **Portfolio** — positions, redeem, withdraw, PnL.
9. Disconnect; verification pass; market-model + position-sizing corrections.

---

## 20. MVP Scope (delivered)
**Must:** connect/disconnect; budget cap; real Payment Kit fee; receipt; BTC/USD market dashboard;
binary + range simulators with real pricing; on-chain mint (one PTB); review; Portfolio + redeem.
**Should:** explorer links; network warning; reset; export receipt; on-chain budget verification.
**Nice:** PLP/vault management UI; analytics (win rate); sponsored/gasless gas; richer charts.

---

## 21. Acceptance Criteria
Presenter completes the flow in < 10 min; connect/disconnect works; demo/testnet status always
visible; budget cap is bounded and verified on-chain; **a real Payment Kit payment appears on the
explorer**; **a real DeepBook Predict mint appears on the explorer**; binary/range explained
clearly; AI summary is safe and advice-free; final action requires signature; Portfolio shows
positions and supports redeem; automatic simulated fallback works.

---

## 22. Risks & Mitigations
1. **Temporary testnet package IDs** (`predict-testnet-4-16`) → adapter pattern + simulated fallback;
   re-verify addresses before the demo.
2. **Wallet/RPC instability on stage** → simulated fallback by default; pre-run txs for known-good
   digests; backup video; local mock-wallet mode.
3. **Position sizing / decimals** → quote→quantity via get_trade_amounts; deposit matches cost+fee;
   verify cost is non-trivial (not dust).
4. **No active oracle to mint** → `create_manager` is a reliable real tx; otherwise fallback simulated.
5. **Audience reads it as advice** → disclaimers, simulation/descriptive language, signature gating.

---

## 23. Contract Reference (Sui Testnet — temporary, re-verify)
```
Predict server   https://predict-server.testnet.mystenlabs.com
Predict package  0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138
Predict registry 0x43af14fed5480c20ff77e2263d5f794c35b9fab7e2212903127062f4fe2a6e64
Predict object   0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a
DUSDC (6 dp)     0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC
PLP              0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::plp::PLP
Payment Kit pkg  0x7e069abe383e80d32f2aec17b3793da82aabc8c2edf84abbf68dd7b719e71497
PayKit Namespace 0xa5016862fdccba7cc576b56cc5a391eda6775200aaa03a6b3c97d512312878db
PaymentRegistry  0x9e2410eead3d1b648acabc73d651bc8acb4fff55c31da6f70c4719316cc18412 (project-created)
Token request    https://tally.so/r/Xx102L   ·   Explorer  https://suiscan.xyz/testnet/tx/<digest>
```
Key functions: `payment_kit::process_registry_payment`; `predict_manager::deposit/withdraw`;
`market_key::new`; `predict::mint/mint_range/redeem/redeem_range/redeem_permissionless`;
`predict::get_trade_amounts/get_range_trade_amounts/supply`.

---

## 24. Final Demo Flow (~30 min)
Problem (3) → Connect Slush testnet (3) → authorize research budget cap (4) → explore live BTC/USD
markets + oracle/vault (6) → simulate with real pricing (5) → place prediction = one signed PTB,
show digest on explorer (5) → Portfolio + redeem (2) → key takeaway (2).

---

## 25. Final Product Message
Builders don't need to rebuild financial infrastructure. With Sui Payment, DeepBook Predict, and a
user-controlled budget, PredictFlow is a real, composable on-chain product — simple for users,
programmable and transparent on-chain, and verifiable on the testnet explorer.