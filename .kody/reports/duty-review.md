# Kody Duty Review

_Rolling 6h cycle — one duty deep-reviewed per tick._

Cycle 17 — 1 healthy, 10 warn, 15 broken of 26 duties.

| Duty | Staff | Cadence | Verdict | Note |
|------|-------|---------|---------|------|
| approval-gate | cto | 15m | broken | state file never created; procedure emits kody-job-next-state but no allowed command writes it |
| architecture-audit | cto | 7d | broken | script never implemented (404); body references deprecated .kody/jobs/ path; no kody-job-next-state block in procedure |
| ceo-performance-review | ceo | 30d | broken | kody-job-next-state block never emitted by procedure; state file never created |
| cleanup-branches | coo | 1d | healthy | passes every check |
| clear-empty-goals | ceo | 7d | broken | 0-step body; no kody-job-next-state block; state file never created |
| coverage-floor | qa | 1d (disabled) | broken | script absent (404); cadence formula inconsistency (every: 1d vs +20h); no kody-job-next-state block in procedure |
| dead-code-sweep | coo | 14d | broken | script never implemented; state at legacy .kody/jobs/ path |
| dependency-bump | coo | 7d | broken | script absent; body references deprecated .kody/jobs/ path |
| design-review | design | 7d | broken | cadence guard (6d) contradicts every: 7d; no kody-job-next-state block |
| dev-ci-health | coo | 1h | broken | kody-job-next-state present but missing lastRunISO/nextEligibleISO fields |
| docs-code | design | 7d | broken | no kody-job-next-state block; state never created |
| docs-readme | design | 14d | warn | no kody-job-next-state block; state never created; lastRunISO never persisted |
| flaky-test-quarantine | qa | 7d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| health-check | coo | 1h | warn | no kody-job-next-state block; state never created |
| job-gap-scan | coo | 1d | broken | state at legacy .kody/jobs/ path; script writes to old location; two non-identical state files |
| pr-health-triage | coo | 6h | warn | no kody-job-next-state block; state never created |
| publish-release | coo | 30d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| qa-sweep | qa | 7d | broken | lastRunISO frozen at 2026-05-23; body updated 2026-05-28 but state not |
| qa-verify | qa | 1h | broken | state.json never created; 0 commits to state file ever |
| qa | qa | 7d | broken | lastRunISO frozen 2026-05-23; lastFiredAt and nextEligibleISO stale 10+ days |
| redispatch | coo | 6h | warn | no kody-job-next-state block; state never created |
| security-audit | ceo | 30d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| system-audit | coo | 1h | warn | no kody-job-next-state block; state never created |
| task-memory-extractor | ceo | 1d | warn | no kody-job-next-state block; state never created |
| type-debt | ceo | 7d (disabled) | warn | no kody-job-next-state block; state never created; disabled=true so idle by design |