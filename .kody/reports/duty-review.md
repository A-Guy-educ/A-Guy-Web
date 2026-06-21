# Kody Duty Review

_Rolling 6h cycle — one duty deep-reviewed per tick._

Cycle 17 — 1 healthy, 15 warn, 10 broken of 26 duties.

| Duty | Staff | Cadence | Verdict | Note |
|------|-------|---------|---------|------|
| approval-gate | cto | 15m | broken | state file never created; kody-job-next-state block present but unreachable |
| architecture-audit | cto | 1h | broken | script never implemented (404); body references deprecated .kody/jobs/ path; no kody-job-next-state block in procedure |
| ceo-performance-review | ceo | 1d | broken | kody-job-next-state block never emitted by procedure; state file never created |
| cleanup-branches | coo | 6h | healthy | passes every check |
| clear-empty-goals | ceo | 1d | broken | 0-step body; no kody-job-next-state block; state file never created |
| coverage-floor | ceo | 1d (disabled) | broken | script absent (404); cadence formula inconsistency (every: 1d vs +20h); no kody-job-next-state block in procedure; disabled=true so idle by design |
| dead-code-sweep | cto | 7d | broken | script never implemented; state at legacy .kody/jobs/ path |
| dependency-bump | cto | 14d | broken | script absent; body references deprecated .kody/jobs/ path |
| design-review | cto | 7d | broken | cadence guard (6d) contradicts every: 7d; no kody-job-next-state block |
| dev-ci-health | cto | 2h | broken | kody-job-next-state present but missing lastRunISO/nextEligibleISO fields |
| docs-code | cto | 7d | broken | no kody-job-next-state block; state never created |
| docs-readme | cto | 7d | warn | no kody-job-next-state block; state never created; lastRunISO never persisted |
| flaky-test-quarantine | qa | 1h (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| health-check | cto | 6h | warn | no kody-job-next-state block; state never created |
| job-gap-scan | cto | 1h | broken | state at legacy .kody/jobs/ path; script writes to old location; two non-identical state files |
| pr-health-triage | cto | 1h | warn | no kody-job-next-state block; state never created |
| publish-release | ceo | 14d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| qa-sweep | qa | 7d | broken | lastRunISO frozen at 2026-05-23; body updated 2026-05-28 but state not |
| qa-verify | qa | 1h | broken | state.json never created; 0 commits to state file ever |
| qa | qa | 1h | broken | lastRunISO frozen 2026-05-23; lastFiredAt and nextEligibleISO stale 10+ days |
| redispatch | cto | 1h | warn | no kody-job-next-state block; state never created |
| security-audit | cto | 14d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| system-audit | cto | 1h | warn | no kody-job-next-state block; state never created |
| task-memory-extractor | cto | 1h | warn | no kody-job-next-state block; state never created |
| type-debt | cto | 14d (disabled) | warn | no kody-job-next-state block; state never created; disabled=true so idle by design