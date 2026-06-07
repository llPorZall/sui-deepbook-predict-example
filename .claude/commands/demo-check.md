---
description: Verify the full demo acceptance criteria (PRD section 21 + BUILD_PLAN DoD)
---
Verify the PredictFlow demo end-to-end against `docs/PRD.md` §21 (Acceptance
Criteria) and the "Before-demo definition of done" in `docs/BUILD_PLAN.md`.

Run, in order:
1. `pnpm typecheck`
2. `pnpm test` (Vitest — includes the AI guardrail / banned-word assertions)
3. The Playwright e2e flow covering Connect → Budget → Pay → Markets → Simulate
   → Review → Portfolio.

Then confirm each acceptance item explicitly:
- Presenter can complete the flow in **< 10 min**.
- **Connect / Disconnect** works (wallet-chip dropdown + Wallet Dashboard button);
  on reconnect, on-chain budget + positions reload.
- **Demo / Testnet status** is always visible (Demo Mode badge + Network badge).
- **Bounded budget cap** is set and **verified on-chain** via
  `lib/budget/onchainBudget.ts`; per-prediction fee is fixed; same prediction is
  dup-protected (free on retry).
- **A real Payment Kit payment appears on the testnet explorer** (non-dust DUSDC
  amount, `process_registry_payment`).
- **A real DeepBook Predict mint appears on the testnet explorer** (non-dust
  cost, quantity derived from `get_trade_amounts`, no stranded funds).
- **Binary + range simulators** are explained clearly and labeled
  `"Live testnet preview"` or `"Simplified simulation"`.
- **AI summary** is safe / advice-free — no banned words
  (`buy, sell, guaranteed, guarantee, safe bet, sure thing, win, profit, "you should"`).
- **Final action requires user signature**; Review defaults to Preview-only;
  Live action is gated on testnet + wallet + balances.
- **Portfolio** lists minted positions with PnL + status, supports Redeem /
  Claim, and supports Withdraw to wallet.
- **Automatic simulated fallback** works when the Predict server / RPC is down
  — the app never crashes.

Report any failing item with the **exact gap** and the offending file:line.
Block the demo on any FAIL; nits go in a second list.
