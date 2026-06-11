# Kody Duty Review

_Rolling 6h cycle — one duty deep-reviewed per tick._

Cycle 17 — 4 healthy, 9 warn, 13 broken of 26 duties.

| Duty | Staff | Cadence | Verdict | Note |
|------|-------|---------|---------|------|
| approval-gate | cto | 15m | broken | state file never created; kody-job-next-state block present but 0 commits to state path |
| architecture-audit | cto | 7d | broken | script never implemented (404); body references deprecated .kody/jobs/ path; no kody-job-next-state block |
| ceo-performance-review | ceo | 7d | broken | kody-job-next-state block never emitted; state file never created |
| cleanup-branches | coo | 1d | healthy | passes every check |
| clear-empty-goals | coo | 1d | broken | 0-step body; no kody-job-next-state block; state never created |
| coverage-floor | coo | 1d | broken | script absent (404); cadence inconsistency (every: 1d vs +20h); disabled=true so idle by design |
| dead-code-sweep | coo | 1d | broken | script never implemented; state at legacy .kody/jobs/ path |
| dependency-bump | coo | 1d | broken | script absent; body references deprecated .kody/jobs/ path |
| design-review | cto | 7d | broken | cadence guard (6d) contradicts every: 7d; no kody-job-next-state block |
| dev-ci-health | coo | 1h | broken | kody-job-next-state present but missing lastRunISO/nextEligibleISO fields |
| docs-code | cto | 7d | broken | no kody-job-next-state block; state never created |
| docs-readme | cto | 7d | warn | no kody-job-next-state block; state never created; lastRunISO never persisted |
| flaky-test-quarantine | qa | 7d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| health-check | coo | 6h | warn | no kody-job-next-state block; state never created |
| job-gap-scan | coo | 1d | broken | state at legacy .kody/jobs/ path; script writes to old location; two non-identical state files |
| pr-health-triage | coo | 1d | warn | no kody-job-next-state block; state never created |
| publish-release | ceo | 7d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| qa-sweep | qa | 1d | broken | lastRunISO frozen at 2026-05-23; body updated 2026-05-28 but state not |
| qa-verify | qa | 1d | broken | state.json never created; 0 commits to state file ever |
| qa | qa | 1d | broken | lastRunISO frozen 2026-05-23; lastFiredAt and nextEligibleISO stale 10+ days |
| redispatch | ceo | 1d | warn | no kody-job-next-state block; state never created |
| security-audit | cto | 7d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| system-audit | coo | 1d | warn | no kody-job-next-state block; state never created |
| task-memory-extractor | coo | 7d | warn | no kody-job-next-state block; state never created |
| type-debt | coo | 7d (disabled) | warn | no kody-job-next-state block; state never created; disabled=true so idle by design |