# Kody Duty Review

_Rolling 6h cycle — one duty deep-reviewed per tick._

Cycle 2 — 0 healthy, 0 warn, 6 broken of 24 duties.

| Duty | Staff | Cadence | Verdict | Note |
|------|-------|---------|---------|------|
| approval-gate | | 7d | broken | state.json never created; 0 commits to state file despite 2 commits to body; data.prs persistence impossible across ticks |
| architecture-audit | cto | 7d (disabled) | broken | disabled=true but referenced script .kody/scripts/architecture-audit-tick.py does not exist; state path in body still points to deprecated .kody/jobs/ after migration |
| ceo-performance-review | | 7d | broken | state.json never created; report exists so duty ran, but promised state file was never persisted |
| cleanup-branches | | 30d | pending | — |
| clear-empty-goals | | 7d | pending | — |
| coverage-floor | | 7d | pending | — |
| dead-code-sweep | | 30d | pending | — |
| dependency-bump | | 30d | pending | — |
| design-review | | 7d | pending | — |
| docs-code | | 7d | pending | — |
| docs-readme | | 30d | pending | — |
| flaky-test-quarantine | | 7d | pending | — |
| health-check | | 1d | pending | — |
| job-gap-scan | | 7d | broken | state.json persisted to .kody/jobs/ (legacy path) while body says .kody/duties/; migration moved file but script still writes to old location; two non-identical state files exist |
| pr-health-triage | | 1d | pending | — |
| publish-release | | 14d | pending | — |
| qa-sweep | qa | 7d | broken | lastRunISO frozen at 2026-05-23; duty body updated 2026-05-28 but state not; cursor idle with no open issue — duty completed but engine stopped invoking 5+ days ago |
| qa-verify | qa | 7d | broken | state.json never created; duty body created 2026-05-27, 0 commits to state file ever; data.inflightPr, data.inflightSinceISO never persisted |
| qa | qa | 7d | pending | — |
| redispatch | | 1d | pending | — |
| security-audit | | 7d | pending | — |
| system-audit | | 1d | pending | — |
| task-memory-extractor | | 7d | pending | — |
| type-debt | | 30d | pending | — |
