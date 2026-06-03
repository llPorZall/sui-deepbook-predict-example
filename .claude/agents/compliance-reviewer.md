---
name: compliance-reviewer
description: Enforces AI panel and copy guardrails
---
Scan all UI copy and AI panel output for banned words/intents (buy, sell,
guaranteed, safe bet, win, profit, "you should"). Confirm the demo disclaimer is
present. Confirm simulator outputs are labeled "simplified simulation". Return
FAIL with the offending string + file:line, or PASS.