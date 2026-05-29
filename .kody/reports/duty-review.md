# Kody Duty Review

_Rolling 6h cycle — one duty deep-reviewed per tick._

Cycle 3 — 0 healthy, 0 warn, 6 broken of 24 duties.

| Duty | Staff | Cadence | Verdict | Note |
|------|-------|---------|---------|------|
| approval-gate | ceo | manual | broken | state.json never created; 0 commits to state file despite 2 commits to body; data.prs persistence impossible across ticks |
| architecture-audit | ceo | 30d (disabled) | broken | disabled=true but referenced script .kody/scripts/architecture-audit-tick.py does not exist; state path in body still points to deprecated .kody/jobs/ after migration |
| ceo-performance-review | ceo | 30d | broken | state.json never created; report ran once (cycle 1, May 27) but promised lastRunISO, nextEligibleISO, cycle, lastGrades never persisted |
| cleanup-branches | coo | manual | broken | no per-tick procedure; no kody-job-next-state block; allowed-commands lists git push --delete but only gh api PUT is permitted; state file never created |
| clear-empty-goals | | | pending | |
| coverage-floor | | | pending | |
| dead-code-sweep | | | pending | |
| dependency-bump | | | pending | |
| design-review | | | pending | |
| docs-code | | | pending | |
| docs-readme | | | pending | |
| flaky-test-quarantine | | | pending | |
| health-check | | | pending | |
| job-gap-scan | ceo | 1d | broken | state.json persisted to .kody/jobs/ (legacy path) while body says .kody/duties/; migration moved file but script still writes to old location; two non-identical state files exist |
| pr-health-triage | | | pending | |
| publish-release | | | pending | |
| qa-sweep | qa | 7d | broken | lastRunISO frozen at 2026-05-23; duty body updated 2026-05-28 but state not; cursor idle with no open issue — duty completed but engine stopped invoking 5+ days ago |
| qa-verify | qa | 1h | broken | state.json never created; duty body created 2026-05-27, 0 commits to state file ever; data.inflightPr, data.inflightSinceISO never persisted |
| qa | qa | | pending | |
| redispatch | | | pending | |
| security-audit | | | pending | |
| system-audit | | | pending | |
| task-memory-extractor | | | pending | |
| type-debt | | | pending |