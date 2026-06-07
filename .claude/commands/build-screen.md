---
description: Build one PredictFlow screen end-to-end from the PRD
---
Build the screen named "$ARGUMENTS" following `docs/PRD.md` §9 (Core Pages and
Screens) and `docs/BUILD_PLAN.md`. Before coding, re-read both files plus
`CLAUDE.md` (design system + non-negotiables).

Rules:
- Wrap the screen body in `<AppShell currentStep={n}>` using the step index map
  from `CLAUDE.md` (Connect=0, Budget=1, Pay=2, Explore/Markets=3, Simulate=4,
  Review=5). **Portfolio is OUTSIDE the stepper** — render it without a
  `currentStep` and rely on the Portfolio nav link.
- Use only `predictflow.css` classes (`.btn`, `.btn--primary|secondary|ghost|lg`,
  `.badge--success|warning|error|info`, `.card`, `.eyebrow`, `.nav`, `.stepper`,
  `.wallet-chip`, `.demo-badge`, `.feature`, etc.). No raw Tailwind for visual
  styling, no shadcn for visuals — shadcn/Radix is allowed only for behavior-only
  primitives (Dialog, DropdownMenu, Select, Tooltip, Toast). Icons from
  `lucide-react` only.
- Data flows through the right adapter:
  - Market / vault / position reads → `lib/predict/predictAdapter.ts` and
    `lib/predict/portfolioAdapter.ts` (with auto Testnet → Simulated fallback).
  - Payment intent / receipt → `lib/payment/*` (Payment Kit + duplicate protection).
  - Budget cap / remaining → `lib/budget/onchainBudget.ts` (derived on-chain).
  - Local demo state → `lib/store/demoStore.ts` (Zustand).
- Pricing labels: testnet outputs are tagged `"Live testnet preview"`; simulated
  outputs are tagged `"Simplified simulation"`. Never an unlabeled number.
- AI panel copy (if the screen has one) must go through `lib/agent/mockResearch.ts`
  + `lib/agent/guardrails.ts` — banned words: `buy, sell, guaranteed, guarantee,
  safe bet, sure thing, win, profit, "you should"`.
- Add the demo disclaimer where §3 / §11 require it
  (*"Demo on Sui Testnet. Educational prototype. Not financial advice."*).
- Final Review defaults to **Preview-only**; Live action is gated on testnet mode
  + connected wallet + sufficient DUSDC / gas. Never auto-submit a tx.

When done: run `pnpm typecheck`, run any relevant Vitest, and summarize what
changed + any open follow-ups against `docs/BUILD_PLAN.md`.
