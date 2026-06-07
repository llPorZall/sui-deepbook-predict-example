---
description: Run the parallel review board on recent changes
---
Spin up the `security-reviewer`, `compliance-reviewer`, and `a11y-reviewer`
subagents **in parallel** (one message, three Agent tool calls) on the files
changed in the last commit (`git diff HEAD~1 --name-only`). If the working
tree has uncommitted changes, include those too (`git status -s`).

Each subagent must return PASS / FAIL per rule with `file:line` evidence,
grounded in `docs/PRD.md` (v2, as-built) and `CLAUDE.md`:
- **security-reviewer** — PRD §11 security bullet + non-negotiables (no
  auto-submit, recipient + amount before signing, no secrets in storage,
  on-chain budget verification, Live-action gated on testnet).
- **compliance-reviewer** — AI panel guardrails + banned words
  (`buy, sell, guaranteed, guarantee, safe bet, sure thing, win, profit,
  "you should"`), testnet disclaimer wording, simulator labels
  (`Live testnet preview` / `Simplified simulation`), data-source tags.
- **a11y-reviewer** — icon + text on every status badge, contrast against
  `predictflow.css` tokens, large tap targets, simple descriptive language,
  keyboard-navigable wallet-chip + stepper.

Aggregate the results:
1. **Blockers** — every FAIL, grouped by reviewer, with file:line.
2. **Nits** — non-blocking suggestions.
3. **Overall verdict** — PASS only if all three reviewers PASS.

Do not auto-fix; report only. The user decides next steps.
