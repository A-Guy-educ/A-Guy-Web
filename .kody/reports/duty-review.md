# Kody Duty Review

_Rolling 6h cycle — one duty deep-reviewed per tick._

Cycle 17 — 1 healthy, 10 warn, 15 broken of 26 duties.

| Duty | Staff | Cadence | Verdict | Note |
|------|-------|---------|---------|------|
| approval-gate | cto | 15m | broken | state never created (0 commits, 404) |
| architecture-audit | cto | 7d | broken | script never implemented (404); deprecated .kody/jobs/ path; no kody-job-next-state block |
| ceo-performance-review | ceo | 30d | broken | kody-job-next-state block never emitted; state file never created |
| cleanup-branches | cto | 1h | healthy | passes every check |
| clear-empty-goals | cto | 1d | broken | 0-step body; no kody-job-next-state block; state never created |
| coverage-floor | cto | 1d (disabled) | broken | script absent (404); cadence formula inconsistency (every: 1d vs +20h); no kody-job-next-state block |
| dead-code-sweep | cto | 7d | broken | script never implemented; state at legacy .kody/jobs/ path |
| dependency-bump | cto | 7d | broken | script absent; body references deprecated .kody/jobs/ path |
| design-review | cto | 7d | broken | cadence guard (6d) contradicts every: 7d; no kody-job-next-state block |
| dev-ci-health | cto | 2h | broken | kody-job-next-state present but missing lastRunISO/nextEligibleISO fields |
| docs-code | cto | 1h | broken | no kody-job-next-state block; state never created |
| docs-readme | cto | 1h | warn | no kody-job-next-state block; state never created; lastRunISO never persisted |
| flaky-test-quarantine | qa | 7d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| health-check | cto | 30m | warn | no kody-job-next-state block; state never created |
| job-gap-scan | cto | 6h | broken | state at legacy .kody/jobs/ path; script writes to old location; two non-identical state files |
| pr-health-triage | cto | 2h | warn | no kody-job-next-state block; state never created |
| publish-release | cto | - (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| qa-sweep | qa | 7d | broken | lastRunISO frozen at 2026-05-23; body updated 2026-05-28 but state not |
| qa-verify | qa | 15m | broken | state.json never created; 0 commits to state file ever |
| qa | qa | 30m | broken | lastRunISO frozen 2026-05-23; lastFiredAt and nextEligibleISO stale 10+ days |
| redispatch | cto | 30m | warn | no kody-job-next-state block; state never created |
| security-audit | cto | - (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| system-audit | cto | 1h | warn | no kody-job-next-state block; state never created |
| task-memory-extractor | cto | 6h | warn | no kody-job-next-state block; state never created |
| type-debt | cto | - (disabled) | warn | no kody-job-next-state block; state never created; disabled=true so idle by design