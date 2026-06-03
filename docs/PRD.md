# Project Requirement Document — PredictFlow

**Sui Payment + DeepBook Predict Demo DApp**

---

## 1. Project Summary

- **Project Name:** PredictFlow
- **Tagline:** Pay for market intelligence. Simulate outcomes. Decide with confidence.
- **Format:** Web Application Demo
- **Target Network:** Sui Testnet
- **Wallet:** Slush Wallet
- **Primary Audience:** Builders, developers, students, and non-technical Web3 participants
- **Demo Duration:** 20–30 minutes
- **Presentation Context:** ON THE MOVE / Road to Sui Overflow 2026

PredictFlow combines three concepts:

1. **Sui Payment** — user-friendly payment flow with payment intent, gas abstraction, and receipt.
2. **DeepBook Predict** — oracle-priced, expiry-based market primitive with binary and vertical range positions.
3. **Agentic Commerce** — a bounded AI-assisted flow where an agent can prepare insights or payment actions within user-defined limits, but the user remains in control of final financial actions.

The app helps builders understand how Sui primitives compose into a real product experience without low-level protocol overload.

---

## 2. Core Demo Narrative

A user connects Slush Wallet, sets a small research budget, pays for an AI-assisted market research report using a Sui Payment-style flow, explores DeepBook Predict market data, simulates binary and range outcomes, and reviews the result before any final action.

**Key message:** Sui enables programmable financial applications where payment, market data, simulation, receipts, and user approval compose into a smooth product experience.

---

## 3. Important Positioning

This is a demo and educational prototype, **not** a production trading application.

**Avoid presenting as:** a gambling product, a sports prediction app, a guaranteed profit tool, a production-ready DeFi trading interface, or a financial advice product.

**Present as:** a builder showcase, a market simulation dashboard, a payment/receipt UX example, a research workflow, a prototype for Sui Overflow builders.

**Recommended UI disclaimer:** "Demo only. This application uses testnet or simulated data and is for educational purposes. It does not provide financial advice."

---

## 4. Objectives

### 4.1 Product Objectives
Demonstrate: connecting with Slush Wallet; a payment flow beyond simple token transfers; setting a bounded research budget; payment status and receipts that build trust; DeepBook Predict market data in a simple dashboard; binary and range positions explained through simulation; an AI agent that assists without unlimited control; a final user decision that stays explicit and user-approved.

### 4.2 Demo Objectives
Make the audience understand: Sui Payment is more than sending tokens; DeepBook Predict is a reusable market primitive; builders can create useful apps without rebuilding all market infrastructure; good UX matters as much as smart contract integration; agentic commerce should be bounded, auditable, and user-controlled.

### 4.3 Technical Objectives
Provide a clean foundation for: wallet connection, user address detection, network detection, basic transaction flow, payment receipt flow, market data fetching, mock/testnet data fallback, simple simulation logic, and clear separation between UI data and critical on-chain verification.

---

## 5. Scope

### 5.1 In Scope
Landing page; Slush Wallet connection; user wallet status; demo payment / research budget setup; payment intent preview; simulated or testnet payment execution; receipt generation; market dashboard; oracle/market lifecycle status display; binary position simulator; vertical range position simulator; AI research summary panel; final review screen; demo activity history; simple responsive design.

### 5.2 Out of Scope
Real mainnet trading; real money deposit flow; sports/political event markets; production-grade custody; production risk engine; full backend accounting; KYC/KYB; fiat on/off-ramp; real AI execution of financial transactions; unlimited agent spending authority; complex portfolio management; full DeepBook Predict production integration if testnet object availability is unstable.

---

## 6. Recommended Product Name

**Primary:** PredictFlow
**Alternatives:** MarketPilot, Sui MarketPilot, Predict Research Agent, FlowPredict, Sui Research Desk
**Final choice:** PredictFlow — easy to remember, product-like, not too technical, communicates a flow from payment → research → simulation → decision.

---

## 7. User Personas

- **7.1 Builder / Developer** — wants clear technical architecture, a simple API/data model, a working wallet flow, a practical demo idea, an easy-to-follow UI.
- **7.2 Student / First-time Builder** — wants simple explanation, visual dashboard, minimal jargon, a clear "what can I build?" message, an achievable demo.
- **7.3 Non-technical Web3 Participant** — wants a simple payment journey, a clear receipt, clear simulation, no complex trading UI, trust and safety messaging.

---

## 8. High-Level User Journey

- **Step 1 — Open App:** hero section, short explanation, "Connect Slush Wallet" button, demo disclaimer.
- **Step 2 — Connect Slush Wallet:** open wallet modal, detect Slush, request approval, show connected address, show network, warn if not on Sui Testnet.
- **Step 3 — Set Research Budget:** e.g. Budget 5 test USDC, Purpose: market research report, Limit: 1 report, Expiry: today, Final trade: user approval required.
- **Step 4 — Preview Payment Intent:** merchant/app name, amount, asset, purpose, recipient, gas strategy, receipt status, duplicate payment protection message.
- **Step 5 — Execute Demo Payment:** MVP can simulate payment and receipt; advanced demo can execute a testnet transaction; production-like demo can use sponsored / gasless transfer if available.
- **Step 6 — Generate Receipt:** payment successful, receipt ID, timestamp, wallet address, amount, purpose, transaction digest if available, "View on Explorer" link if available.
- **Step 7 — Load Market Dashboard:** asset, expiry, oracle status, market type, settlement status, example binary position, example range position, vault summary.
- **Step 8 — Run AI Research Summary:** deterministic mock text for demo. Covers market status, expiry timeline, key risk points, binary explanation, range explanation, things to check before deciding. The AI must NOT say "buy," "sell," "guaranteed," or "you should trade." It should say: "Here is what this market represents," "Here are the risks," "Here is how the payoff works," "User approval is required for any final action."
- **Step 9 — Simulate Binary Position:** inputs Asset (SUI), Direction (Above), Strike, Expiry, Quote amount → outputs estimated cost, potential payout, max loss, expiry, oracle dependency, settlement condition.
- **Step 10 — Simulate Vertical Range Position:** inputs lower strike, higher strike, expiry, quote amount → outputs range condition, estimated cost, potential payout, payoff explanation, simple chart/visual band.
- **Step 11 — Final Review:** research payment completed, receipt generated, market data reviewed, simulation completed, final action requires user signature. Final CTAs: "Prepare Demo Transaction," "Preview Only," "Do Not Execute." **For demo safety, default = Preview Only.**

---

## 9. Core Pages and Screens

### 9.1 Page 1 — Landing / Connect
Header (logo/app name), short tagline, Connect Slush Wallet button, demo disclaimer, three feature cards (Pay for research, Explore Predict markets, Simulate outcomes).
- Hero title: **PredictFlow**
- Hero subtitle: "A simple demo showing how Sui Payment, DeepBook Predict, and bounded AI agents can work together."
- CTA: Connect Slush Wallet
- Disclaimer: "Demo only. Uses testnet or simulated data. Not financial advice."

### 9.2 Page 2 — Wallet Dashboard
Connected wallet card (address, network, balance placeholder, testnet status), Start demo button.
- **Required fields:** wallet address, network name, connection status, wallet provider, optional SUI balance, optional stablecoin balance.
- **Error states:** wallet not installed, wallet rejected connection, wrong network, no account selected, connection timeout.

### 9.3 Page 3 — Research Budget Setup
Budget input, asset selector, purpose selector, expiry selector, approval rule selector, summary card.
- **Default demo values:** Budget 5 demo USDC; Purpose: market research; Expiry: 24 hours; Approval rule: final financial action requires user signature; Recipient: demo merchant account; Gas: sponsored/gasless if available, otherwise simulated.
- **Constraints shown clearly:** spending cap, purpose, recipient, expiry, number of uses, final approval requirement.

### 9.4 Page 4 — Payment Intent Preview
Payment summary (amount, asset, purpose, recipient, gas strategy), duplicate prevention note, receipt preview, confirm button, back button.
- Key message: "A payment intent bundles the payment purpose, amount, recipient, and execution rules into a clear flow before the user confirms."

### 9.5 Page 5 — Payment Result / Receipt
Success state, receipt card (tx digest, timestamp, purpose, amount, wallet address, receipt ID), Continue to Market Dashboard button.

```json
{
  "receiptId": "demo_receipt_001",
  "status": "paid",
  "walletAddress": "0x...",
  "amount": "5",
  "asset": "USDC_DEMO",
  "purpose": "Market Research Report",
  "recipient": "PredictFlow Demo Merchant",
  "timestamp": "ISO_DATE",
  "txDigest": "optional",
  "network": "sui-testnet",
  "duplicateProtectionKey": "wallet-purpose-date"
}
```

### 9.6 Page 6 — Market Dashboard
Market list, market status cards, oracle lifecycle badge, expiry timeline, binary market card, range market card, vault summary card.
- **Market card fields:** market ID, asset, expiry, oracle status, market type, strike/range, settlement status, last update, data source.

```json
{
  "marketId": "SUI-USDC-ABOVE-5-DEMO",
  "asset": "SUI",
  "quoteAsset": "USDC_DEMO",
  "type": "binary",
  "direction": "above",
  "strike": "5.00",
  "expiry": "2026-06-30T00:00:00Z",
  "oracleStatus": "Active",
  "settlementStatus": "Not Settled",
  "lastOraclePrice": "4.72",
  "dataMode": "simulated"
}
```

### 9.7 Page 7 — AI Research Summary
AI summary card (market context, risk notes, what to verify, final action reminder).
- **Recommended output:** "This market represents whether SUI settles above the selected strike at expiry. The oracle status is currently Active, which means the market can be simulated in this demo. Before any real transaction, verify the oracle status, expiry, vault health, and settlement rules. This assistant can prepare analysis, but final financial actions require user approval."
- **AI must NOT:** promise profit; tell user to buy/sell; present simulation as guaranteed; execute high-value action without user approval; hide risk; use language like "safe bet" or "guaranteed win."

### 9.8 Page 8 — Binary Position Simulator
Asset selector, direction selector, strike input, expiry selector, quote amount input, preview button, result card, payoff explanation.
- **Inputs:** asset, direction (above/below), strike, expiry, quote amount.
- **Outputs:** estimated cost, max loss, potential payout, settlement condition, oracle dependency, expiry countdown.
- Example: "This binary position pays if SUI settles above $5 at expiry. If the final settlement price is not above $5, the position expires without payout."

### 9.9 Page 9 — Vertical Range Simulator
Asset selector, lower strike input, higher strike input, expiry selector, quote amount input, range visualization, result card.
- **Inputs:** asset, lower strike, higher strike, expiry, quote amount.
- **Outputs:** estimated cost, payoff condition, max loss, potential payout, range visualization.
- Example: "This range position is designed around the view that SUI settles inside a selected price band at expiry."

### 9.10 Page 10 — Final Review
Completed steps checklist (payment receipt, market selected, simulation result, user approval reminder), CTA buttons: Preview Demo Transaction, Export Demo Receipt, Restart Demo.
- Required message: "The AI assistant can prepare research and simulation, but the user must explicitly approve any final financial action."

---

## 10. Functional Requirements

### 10.1 Wallet Connection
User can connect Slush Wallet; modal opens; user approves; app receives + displays shortened address; detects network; warns if not Sui Testnet; user can disconnect/reconnect. Recommended: Sui dApp Kit, Sui TypeScript SDK, Slush via Wallet Standard / dApp Kit.

### 10.2 Network Handling
Configured for Sui Testnet. Shows active network; warns on unsupported network; prevents demo transaction if unsupported; allows simulated mode even if live transaction unavailable.

### 10.3 Demo Payment Flow
Set budget → preview → confirm → generate receipt → receipt appears in dashboard → prevent duplicate payment for same session → allow reset.
- **Option A — Fully Simulated** (fastest): no real tx, local receipt, digest shown as "simulated."
- **Option B — Testnet Transaction:** user signs a simple testnet tx, digest shown, receipt after success.
- **Option C — Sponsored / Gasless:** app prepares tx, sponsor pays gas / gasless flow, no SUI gas management for user.
- **Recommended for first demo:** Build Option A first, then add Option B if time allows.

### 10.4 Receipt System
Unique ID, timestamp, user wallet, amount/asset/purpose/recipient, visible in dashboard, copyable/exportable as JSON, explorer link if tx digest exists.

### 10.5 Market Dashboard
List of demo markets; each shows asset, expiry, type, oracle status, settlement status; select one market; show Inactive/Active/Pending Settlement/Settled; show demo vault summary; show data source (Testnet/Simulated).

### 10.6 Oracle Lifecycle Display
States: Inactive, Active, Pending Settlement, Settled. Status shown as a badge with explanation; prevent "mint simulation" if not Active; allow "settlement explanation" if Settled; show expiry time and countdown.

### 10.7 Binary Position Simulator
Select above/below; see strike; input demo quote amount; preview estimated outcome; explain winning condition, max loss, oracle and expiry dependency.

### 10.8 Vertical Range Simulator
Input lower + higher strike; validate lower < higher; show price band visually; explain payoff condition; show estimated result; explain risk clearly.

### 10.9 AI Research Summary
Generated after payment; references selected market; explains market condition; includes risk notes; provides no financial advice; reminds user that final action requires approval. **MVP:** deterministic mock output. **Advanced:** LLM API with strict guardrails and fixed template.

### 10.10 Agentic Commerce Policy
User can see: budget cap, allowed recipient, payment purpose, expiry time, asset type, final approval rule. App must state: "The agent can prepare research and payment intent, but cannot execute final financial actions without user approval."

### 10.11 Demo Reset
Reset button clears local session; receipt history can reset; selected market resets; payment state resets; wallet remains connected unless user disconnects.

---

## 11. Non-Functional Requirements

- **11.1 Performance:** fast initial load; dashboard under 2s with mock data; wallet connection shows loading state; no screen blocks without feedback.
- **11.2 Reliability:** works even if live DeepBook Predict data is unavailable; has simulated fallback; does not crash if wallet unavailable; shows friendly errors.
- **11.3 Security:** never ask for seed phrase; never request unnecessary permissions; never auto-submit financial transactions; never hide recipient or amount; always show preview before signing; always show final confirmation; final financial action must require user approval.
- **11.4 Compliance / Safety:** add demo disclaimer; avoid gambling/sports/political markets; avoid "profit" language; avoid trading recommendation language; avoid "guaranteed" language; keep all data testnet/simulated unless explicitly upgraded.
- **11.5 Accessibility:** readable text; strong contrast; large buttons; status badges not color-only; simple language.

---

## 12. Technical Architecture

### 12.1 Recommended Stack
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, Sui dApp Kit, Sui TypeScript SDK.
- **Wallet:** Slush Wallet, Sui Wallet Standard compatible connection via dApp Kit.
- **State:** React Query (async data), Zustand or simple React state (demo session), LocalStorage (receipt persistence).
- **Backend:** MVP can run without backend. Optional: Next.js API routes, Node.js, mock market API, receipt API, AI summary API.
- **Data Mode:** Simulated Mode (static JSON markets, local receipt, mock AI summary) and Testnet Mode (Sui Testnet RPC, wallet tx, explorer link, DeepBook Predict testnet objects if stable).
- **Recommended first implementation:** Simulated Mode + Wallet Connect + optional simple Testnet transaction.

---

## 13. Suggested Folder Structure

```
predictflow/
  app/
    page.tsx
    dashboard/page.tsx
    payment/page.tsx
    markets/page.tsx
    simulate/page.tsx
    review/page.tsx
  components/
    layout/      Header.tsx  AppShell.tsx  Footer.tsx
    wallet/      ConnectWalletButton.tsx  WalletStatusCard.tsx  NetworkBadge.tsx
    payment/     BudgetSetupCard.tsx  PaymentIntentPreview.tsx  ReceiptCard.tsx
    markets/     MarketCard.tsx  MarketStatusBadge.tsx  OracleLifecycle.tsx  VaultSummaryCard.tsx
    simulator/   BinarySimulator.tsx  RangeSimulator.tsx  PayoffPreview.tsx
    agent/       AgentPolicyCard.tsx  ResearchSummaryCard.tsx
  lib/
    sui/         client.ts  wallet.ts  transactions.ts
    payment/     createPaymentIntent.ts  createReceipt.ts  duplicateProtection.ts
    predict/     mockMarkets.ts  predictAdapter.ts  simulator.ts
    agent/       mockResearch.ts  guardrails.ts
  data/          demoMarkets.json  demoVaults.json
  types/         payment.ts  predict.ts  wallet.ts  agent.ts
```

---

## 14. Core Data Models

```typescript
// 14.1 Wallet State
type WalletState = {
  connected: boolean;
  address?: string;
  walletName?: string;
  network?: "sui:testnet" | "sui:mainnet" | "unknown";
};

// 14.2 Payment Intent
type PaymentIntent = {
  id: string;
  walletAddress: string;
  recipient: string;
  amount: string;
  asset: string;
  purpose: string;
  expiry: string;
  gasStrategy: "normal" | "sponsored" | "gasless" | "simulated";
  status: "draft" | "previewed" | "paid" | "failed" | "expired";
  duplicateProtectionKey: string;
};

// 14.3 Receipt
type Receipt = {
  receiptId: string;
  paymentIntentId: string;
  walletAddress: string;
  recipient: string;
  amount: string;
  asset: string;
  purpose: string;
  timestamp: string;
  network: string;
  txDigest?: string;
  status: "paid" | "simulated" | "failed";
};

// 14.4 Predict Market
type PredictMarket = {
  marketId: string;
  asset: string;
  quoteAsset: string;
  marketType: "binary" | "vertical_range";
  direction?: "above" | "below";
  strike?: number;
  lowerStrike?: number;
  higherStrike?: number;
  expiry: string;
  oracleStatus: "Inactive" | "Active" | "PendingSettlement" | "Settled";
  lastOraclePrice?: number;
  settlementPrice?: number;
  dataSource: "testnet" | "simulated";
};

// 14.5 Vault Summary
type VaultSummary = {
  vaultId: string;
  quoteAsset: string;
  totalLiquidity: string;
  liabilities: string;
  maxPayout: string;
  utilizationRate: string;
  plpSharePrice?: string;
  dataSource: "testnet" | "simulated";
};

// 14.6 Agent Policy
type AgentPolicy = {
  policyId: string;
  walletAddress: string;
  spendingCap: string;
  asset: string;
  allowedRecipient: string;
  purpose: string;
  expiry: string;
  frequencyLimit: number;
  finalActionRequiresUserSignature: boolean;
};
```

---

## 15. Simulation Logic

### 15.1 Binary Position Simulation
Inputs: direction, strike, last oracle price, expiry, quote amount. Outputs: estimated cost, potential payout, max loss, winning condition.

```javascript
function simulateBinaryPosition(input) {
  const maxLoss = input.quoteAmount;
  const potentialPayout = input.quoteAmount * 1.8;
  return {
    maxLoss,
    potentialPayout,
    condition:
      input.direction === "above"
        ? `Pays if ${input.asset} settles above ${input.strike}`
        : `Pays if ${input.asset} settles below ${input.strike}`,
  };
}
```
**For demo, label this clearly as simplified simulation.**

### 15.2 Range Position Simulation
Inputs: lower strike, higher strike, last oracle price, expiry, quote amount. Validation: lower < higher; expiry in future; quote positive. Outputs: selected range, max loss, potential payout, winning condition.

```javascript
function simulateRangePosition(input) {
  if (input.lowerStrike >= input.higherStrike) {
    throw new Error("Lower strike must be below higher strike");
  }
  return {
    maxLoss: input.quoteAmount,
    potentialPayout: input.quoteAmount * 2.2,
    condition: `Pays if ${input.asset} settles between ${input.lowerStrike} and ${input.higherStrike}`,
  };
}
```

---

## 16. Design Requirements

- **16.1 Direction:** clean, minimal, calm, demo-friendly, easy from a projector, not too trading-heavy, not too dark, aligned with Sui / ON THE MOVE style.
- **16.2 Visual Style:** white background, soft light-blue cards, deep navy text, Sui blue accent, rounded cards, simple icons, clear badges, large spacing, minimal tables, step-by-step layout.

### 16.3 Color Palette
| Token | Value |
|---|---|
| Primary Blue | `#298DFF` |
| Deep Navy | `#081C2E` |
| Text Ink | `#0B2438` |
| Muted Text | `#647584` |
| Light Blue Card | `#EEF7FF` |
| Border | `#D8EAFE` |
| Background | `#FFFFFF` |
| Success | `#1A9B6C` |
| Warning | `#D99A00` |
| Error | `#D94A4A` |

### 16.4 Typography
Heading: Inter 600–700; Body: Inter 400–500; Labels: JetBrains Mono or Inter Mono. Avoid overly small text; use large readable cards for projection.

- **16.5 Layout Principles:** one key idea per screen; avoid dense tables; 3–5 cards per section; badges for status; progress steps for flow; obvious CTA; technical details in expandable sections.
- **16.6 Main UI Layout:** Top nav `[PredictFlow Logo] [Demo Mode Badge] [Docs] [Connected Wallet]`; main content left = current step, center = main action card, right = context/receipt/status; footer "Demo only · Sui Testnet · Not financial advice".
- **16.7 Navigation Stepper:** Connect → Budget → Pay → Explore → Simulate → Review.

---

## 17. UI Component Requirements

- **17.1 Connect Wallet Button states:** Not connected ("Connect Slush Wallet"), Connecting ("Connecting..."), Connected ("0x1234...abcd"), Error ("Connection failed").
- **17.2 Demo Mode Badge:** text "Demo Mode"; tooltip "This app uses testnet or simulated data for educational purposes."
- **17.3 Network Badge states:** Sui Testnet (success/green), Sui Mainnet (warning), Unknown (error), Not connected (neutral).
- **17.4 Market Status Badge states:** Inactive, Active, Pending Settlement, Settled — each with a short explanation.
- **17.5 Receipt Card fields:** receipt ID, status, amount, purpose, wallet, time, tx digest, explorer link.
- **17.6 Agent Policy Card fields:** spending cap, allowed recipient, purpose, expiry, asset, final approval required.
- **17.7 Simulator Result Card fields:** position type, condition, quote amount, estimated cost, potential payout, max loss, expiry, risk note.

---

## 18. Demo Script

- **18.1 Opening:** building a product for users who want to understand market outcomes without complex DeFi infra or poor payment UX.
- **18.2 Wallet Connect:** user connects Slush; app gets address and approval capability.
- **18.3 Budget Setup:** instead of unlimited AI control, user sets a small research budget with clear limits.
- **18.4 Payment Intent:** Sui Payment becomes more than a token transfer — app knows purpose, recipient, amount, receipt rule.
- **18.5 Receipt:** user and merchant both get a clear receipt for reconciliation, auditability, trust.
- **18.6 Market Dashboard:** DeepBook Predict side — markets, oracle status, expiry, vault info.
- **18.7 Binary Simulator:** a simple yes/no view around a price level at expiry.
- **18.8 Range Simulator:** a view that settlement lands inside a selected band.
- **18.9 AI Research:** agent summarizes context + simulation but does not execute the final action.
- **18.10 Closing:** builders can compose Sui Payment, DeepBook Predict, and bounded agent policy into a clear, programmable, user-controlled product.

---

## 19. Build Phases

| Phase | Goal | Deliverables | Effort |
|---|---|---|---|
| 1 — Design Prototype | Clickable UI, no blockchain | Figma: landing, wallet mock, payment mock, market dashboard mock, simulator mock, review screen | 1–2 days |
| 2 — Frontend MVP | Working app with mock data | Next.js app, static market data, local receipt system, simulator logic, demo reset | 2–4 days |
| 3 — Wallet Integration | Slush Wallet connection | dApp Kit integration, connect/disconnect, address display, network detection | 1–2 days |
| 4 — Testnet Transaction | Optional real testnet tx | Simple transaction, tx digest, explorer link, receipt linked to tx | 1–3 days |
| 5 — DeepBook Predict Integration | Replace some mock data with testnet if stable | Predict data adapter, market status fetch, vault summary fetch, fallback to simulated | 2–5 days |
| 6 — Demo Polish | Smooth live presentation | Loading states, error states, reset button, presenter mode, final copy review, mobile/tablet check | 1–2 days |

---

## 20. Recommended MVP Scope

- **Must Have:** clean landing page, Slush Wallet connect, demo payment intent, receipt generation, market dashboard with simulated DeepBook Predict data, binary simulator, range simulator, AI research summary, final review screen.
- **Should Have:** Sui Testnet tx digest, explorer link, network warning, demo reset, export receipt JSON.
- **Nice to Have:** sponsored transaction demo, gasless stablecoin demo, live DeepBook Predict testnet data, real AI-generated summary, vault health chart, payoff chart.

---

## 21. Acceptance Criteria

The demo succeeds if: presenter completes full flow in under 10 minutes; user can connect Slush Wallet; app clearly shows demo/testnet status; user can set bounded budget; payment preview is understandable; receipt is generated; market dashboard is easy to understand; binary and range positions are visually explained; AI assistant does not provide unsafe or misleading advice; final action requires user approval; app can reset for repeated demo.

---

## 22. Risks and Mitigations

1. **DeepBook Predict testnet data changes** → use adapter pattern; keep simulated fallback; label data source clearly.
2. **Wallet connection issue during live demo** → prepare backup browser profile; local mock wallet mode; record backup demo video; have screenshots ready.
3. **Testnet RPC instability** → simulated mode by default; only switch to live if stable; cache demo data.
4. **Audience thinks this is financial advice** → add disclaimer; use "simulation" language; avoid buy/sell recommendation; emphasize user approval.
5. **Payment features not fully available on testnet** → start with simulated payment intent; add real testnet tx as optional; explain concept clearly.

---

## 23. Important Documentation to Read

- **Wallet / Slush / dApp Kit:** Slush Wallet docs, Sui dApp Kit docs, DApp Kit instance setup, wallet connection actions, Sui Wallet Standard.
- **Sui Payment:** Payments overview, Address Balances (using + migrating), Payment Intents, Transaction payment, Sponsored Transactions, Gasless Stablecoin Transfers, Payment Kit.
- **DeepBook Predict:** overview, design, contract information, market keys, Vault, Predict object, OracleSVI, PredictManager, DeepBook v3 GitHub repo, DeepBook Trader Hub.
- **Demo / Design:** Sui Payments landing page, Sui visual style, ON THE MOVE presentation design, existing presentation slides for content alignment.

---

## 24. Final Recommended Demo Flow (30 min)

| Time | Segment |
|---|---|
| 0–3 min | Explain the problem (market infra + payment UX is hard) |
| 3–6 min | Connect Slush Wallet (address/network detect) |
| 6–10 min | Setup bounded research budget |
| 10–14 min | Payment intent and receipt |
| 14–20 min | Market dashboard (markets, oracle status, expiry, vault) |
| 20–25 min | Simulators (binary + range) |
| 25–28 min | Agent research summary (summarize, not execute) |
| 28–30 min | Key takeaway |

---

## 25. Final Product Message

Builders do not need to rebuild every piece of financial infrastructure. With Sui Payment, DeepBook Predict, and user-controlled agent policies, they can build apps that feel simple to users while still being programmable, composable, and transparent on-chain.
