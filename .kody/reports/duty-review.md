# Kody Duty Review

_Rolling 6h cycle — one duty deep-reviewed per tick._

Cycle 17 — 1 healthy, 9 warn, 15 broken of 25 duties.

| Duty | Staff | Cadence | Verdict | Note |
|------|-------|---------|---------|------|
| approval-gate | cto | 15m | broken | state never created; cadence guard unreachable (lastRunISO never written, no guard in procedure) |
| architecture-audit | staff | — | broken | script never implemented (404); body references deprecated .kody/jobs/ path; no kody-job-next-state block in procedure |
| ceo-performance-review | ceo | 1d | broken | kody-job-next-state block never emitted by procedure; state file never created |
| cleanup-branches | staff | 1d | healthy | passes every check |
| clear-empty-goals | staff | — | broken | 0-step body; no kody-job-next-state block; state file never created |
| coverage-floor | staff | 1d (disabled) | broken | script absent (404); cadence formula inconsistency (every: 1d vs +20h); no kody-job-next-state block in procedure |
| dead-code-sweep | staff | — | broken | script never implemented; state at legacy .kody/jobs/ path |
| dependency-bump | staff | — | broken | script absent; body references deprecated .kody/jobs/ path |
| design-review | staff | 7d | broken | cadence guard (6d) contradicts every: 7d; no kody-job-next-state block |
| dev-ci-health | staff | 2h | broken | kody-job-next-state present but missing lastRunISO/nextEligibleISO fields |
| docs-code | staff | — | broken | no kody-job-next-state block; state never created |
| docs-readme | staff | — | warn | no kody-job-next-state block; state never created; lastRunISO never persisted |
| flaky-test-quarantine | qa | — (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| health-check | staff | — | warn | no kody-job-next-state block; state never created |
| job-gap-scan | staff | — | broken | state at legacy .kody/jobs/ path; script writes to old location; two non-identical state files |
| pr-health-triage | staff | — | warn | no kody-job-next-state block; state never created |
| publish-release | staff | — (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| qa-sweep | qa | 7d | broken | lastRunISO frozen at 2026-05-23; body updated 2026-05-28 but state not |
| qa-verify | qa | 1h | broken | state.json never created; 0 commits to state file ever |
| qa | qa | — | broken | lastRunISO frozen 2026-05-23; lastFiredAt and nextEligibleISO stale 10+ days |
| redispatch | staff | — | warn | no kody-job-next-state block; state never created |
| security-audit | staff | — (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| system-audit | staff | 6h | warn | no kody-job-next-state block; state never created |
| task-memory-extractor | staff | — | warn | no kody-job-next-state block; state never created |
| type-debt | staff | — (disabled) | warn | no kody-job-next-state block; state never created; disabled=true so idle by design |
