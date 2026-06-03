# PredictFlow — Project Constitution (CLAUDE.md)

## What this is
A 20–30 min demo dApp for Sui Overflow 2026 showing how Sui Payment, DeepBook Predict,
and a bounded AI agent compose into one product flow. Source of truth for requirements:
`docs/PRD.md`. Task plan: `docs/BUILD_PLAN.md`. This is an educational prototype, NOT a
trading or gambling product.

---

## Non-negotiable rules
1. **Never break the build.** Every change must pass `pnpm typecheck` and `pnpm build`.
2. **Adapter + data mode.** All market/vault data goes through
   `lib/predict/predictAdapter.ts`. Default `NEXT_PUBLIC_DATA_MODE=simulated`. Never call
   live RPC without an automatic simulated fallback.
3. **No secrets in storage.** Never store keys, secrets, or seed phrases in localStorage —
   receipts only (non-sensitive).
4. **User signature gates everything.** Final financial actions ALWAYS require explicit
   user signature. The review screen defaults to "Preview Only". Never auto-submit a tx.
5. **Transparency.** Always show recipient + amount before any sign step.

---

## AI panel guardrails (HARD)
The AI research panel and any AI output must NEVER contain these words/intents:
`buy, sell, guaranteed, guarantee, safe bet, sure thing, win, profit, "you should"`.
It MAY only: describe what a market represents, explain payoff mechanics, list risks,
list what to verify, and state that user approval is required. Enforce this in
`lib/agent/mockResearch.ts` via a fixed template + the banned-word guard, and assert it
in tests.

---

## Tech stack (fixed)
Next.js (App Router) · TypeScript strict · Tailwind · **predictflow.css design system**
(see below) · @mysten/dapp-kit · @mysten/sui · @tanstack/react-query · Zustand · Vitest ·
Playwright · lucide-react (icons). shadcn/Radix is permitted ONLY for behavior-only
primitives (see Design system).

---

## Design system — SOURCE OF TRUTH (from Claude Design handoff)
The design system is `src/app/predictflow.css`. Treat it and
`src/components/layout/AppShell.tsx` as **FROZEN**. All visual components use its classes:
`.btn` / `.btn--primary|secondary|ghost|lg`, `.badge--success|warning|error|info`,
`.card`, `.eyebrow`, `.nav`, `.stepper`, `.wallet-chip`, `.demo-badge`, `.feature`, etc.

- Do NOT style brand/visual components with shadcn or raw Tailwind utilities — use the
  predictflow.css classes.
- shadcn/Radix is allowed ONLY for behavior-only primitives (Dialog, DropdownMenu, Select,
  Tooltip, Toast), restyled to the tokens.
- If a screen needs a new shared element, add it to `predictflow.css` using existing
  tokens — never fork styles inline or "improve"/restyle the system.
- Icons come from `lucide-react` only. No other icon sets; no emoji in UI.

---

## Tokens (authoritative — the superset the design committed to)
```
Colors: --blue #298DFF  --navy #081C2E  --ink #0B2438  --muted #647584
        --card #EEF7FF  --border #D8EAFE  --bg #FFFFFF
        --success #1A9B6C  --warning #D99A00  --error #D94A4A
Tints:  --success-tint #E7F6EF  --warning-tint #FBF2DC  --error-tint #FBEAEA
Geom:   --r-card 16px  --r-control 10px  --shadow-card (defined)  --maxw 1120px
Type:   --sans Inter (headings 600–700, body 400–500)  --mono JetBrains Mono (labels,
        addresses, numerics)
```

---

## App shell
Every page wraps its body in `<AppShell currentStep={n}>` from
`src/components/layout/AppShell.tsx`. Never re-implement nav/stepper/footer per page.
- The stepper is **sticky** under the sticky nav (confirmed design decision).
- Step index map: `Connect=0  Budget=1  Pay=2  Explore/Markets=3  Simulate=4  Review=5`.
- Logo mark = the branching-node glyph (matches `public/logo.svg`), already wired in AppShell.

---

## Fonts
Load Inter + JetBrains Mono via **`next/font`** in `app/layout.tsx` and expose them as
`--sans` / `--mono` so `predictflow.css` consumes them. Remove the prototype's Google Fonts
`<link>` tags (perf + the <2s dashboard load target in PRD §11.1).

---

## Layout rules
One key idea per screen. 3–5 cards per section. Obvious primary CTA. Status badges must use
icon + text label, never color alone (already satisfied by `.badge`). Keep technical detail
in expandable sections. Desktop-first, responsive to tablet.

---

## Handoff boundary (visual vs. logic)
Screen components recreate the Claude Design prototype's `<main>` body **visually, on mock
data only**. Never copy or trust logic from the prototypes. Wallet connection,
`predictAdapter`, payment/receipt, and simulator math are built **fresh** per
`docs/BUILD_PLAN.md` against the types in `types/`.

---

## Folder structure (PRD §13)
```
app/         page.tsx · dashboard/ · budget/ · payment/ · markets/ · simulate/ · review/
components/  layout/{Header,AppShell,Footer}  wallet/  payment/  markets/  simulator/  agent/
lib/         sui/{client,wallet,transactions}  payment/{createPaymentIntent,createReceipt,duplicateProtection}
             predict/{mockMarkets,predictAdapter,simulator}  agent/{mockResearch,guardrails}
data/        demoMarkets.json · demoVaults.json
types/       payment.ts · predict.ts · wallet.ts · agent.ts
```

---

## Workflow expectations
- Read `docs/PRD.md` and `docs/BUILD_PLAN.md` before each task.
- Build one screen/feature at a time. Show a plan before large changes.
- When building a screen, recreate the matching bundle screen's `<main>` body using
  predictflow.css classes inside `<AppShell>` — do not regenerate the shell or restyle
  the design system.
- After each feature: run `pnpm typecheck` + the relevant tests, then summarize.
- Use `/clear` between unrelated features to avoid context drift.
```
