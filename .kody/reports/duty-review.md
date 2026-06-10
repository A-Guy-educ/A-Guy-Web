# Kody Duty Review

_Rolling 6h cycle — one duty deep-reviewed per tick._

## Cycle 17 — 14 broken, 10 warn, 1 healthy of 25 duties.

| Duty | Staff | Cadence | Verdict | Note |
|------|-------|---------|---------|------|
| approval-gate | cto | 15m | broken | kody-job-next-state block documented but never emitted by procedure; state file never created (0 commits to state path) |
| architecture-audit | staff | 7d | broken | script never implemented (404); body references deprecated .kody/jobs/ path; no kody-job-next-state block in procedure |
| ceo-performance-review | ceo | 7d | broken | kody-job-next-state block never emitted by procedure; state file never created |
| cleanup-branches | staff | 1d | healthy | passes every check |
| clear-empty-goals | ceo | 1d | broken | 0-step body; no kody-job-next-state block; state never created |
| coverage-floor | qa | 1d (disabled) | broken | script absent (404); cadence formula inconsistency (every: 1d vs +20h); no kody-job-next-state block in procedure |
| dead-code-sweep | staff | 7d | broken | script never implemented; state at legacy .kody/jobs/ path |
| dependency-bump | staff | 7d | broken | script absent; body references deprecated .kody/jobs/ path |
| design-review | design | 7d | broken | cadence guard (6d) contradicts every: 7d; no kody-job-next-state block |
| dev-ci-health | staff | 1d | broken | kody-job-next-state present but missing lastRunISO/nextEligibleISO fields |
| docs-code | staff | 1d | broken | no kody-job-next-state block; state never created |
| docs-readme | staff | 1d | warn | no kody-job-next-state block; state never created; lastRunISO never persisted |
| flaky-test-quarantine | qa | 7d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| health-check | staff | 15m | warn | no kody-job-next-state block; state never created |
| job-gap-scan | cto | 7d | broken | state at legacy .kody/jobs/ path; script writes to old location; two non-identical state files |
| pr-health-triage | cto | 1d | warn | no kody-job-next-state block; state never created |
| publish-release | staff | 7d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| qa-sweep | qa | 7d | broken | lastRunISO frozen at 2026-05-23; body updated 2026-05-28 but state not |
| qa-verify | qa | 7d | broken | state.json never created; 0 commits to state file ever |
| qa | qa | 7d | broken | lastRunISO frozen 2026-05-23; lastFiredAt and nextEligibleISO stale 10+ days |
| redispatch | staff | 1h | warn | no kody-job-next-state block; state never created |
| security-audit | staff | 7d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| system-audit | staff | 1h | warn | no kody-job-next-state block; state never created |
| task-memory-extractor | staff | 7d | warn | no kody-job-next-state block; state never created |
| type-debt | staff | 7d (disabled) | warn | no kody-job-next-state block; state never created; disabled=true so idle by design