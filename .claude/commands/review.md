---
description: Run the parallel review board on recent changes
---
Spin up the security-reviewer, compliance-reviewer, and a11y-reviewer subagents in
parallel on the files changed in the last commit. Each returns PASS/FAIL with line
references. Summarize blockers first, then nits.