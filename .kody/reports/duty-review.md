# Kody Duty Review

_Rolling 6h cycle — one duty deep-reviewed per tick._

Cycle 17 — 14 broken, 10 warn, 1 healthy of 25 duties.

| Duty | Staff | Cadence | Verdict | Note |
|------|-------|---------|---------|------|
| approval-gate | cto | 15m | broken | state file never created (404); 0 commits to state path |
| architecture-audit | coo | 6h | broken | script never implemented (404); body references deprecated .kody/jobs/ path; no kody-job-next-state block in procedure |
| ceo-performance-review | ceo | 7d | broken | kody-job-next-state block never emitted by procedure; state file never created |
| cleanup-branches | coo | 6h | healthy | passes every check |
| clear-empty-goals | ceo | 1d | broken | 0-step body; no kody-job-next-state block; state file never created |
| coverage-floor | ceo | 1d | broken (disabled) | script absent (404); cadence formula inconsistency (every: 1d vs +20h); no kody-job-next-state block in procedure; disabled=true so idle by design |
| dead-code-sweep | cto | 7d | broken | script never implemented; state at legacy .kody/jobs/ path |
| dependency-bump | cto | 7d | broken | script absent; body references deprecated .kody/jobs/ path |
| design-review | cto | 7d | broken | cadence guard (6d) contradicts every: 7d; no kody-job-next-state block |
| dev-ci-health | cto | 1h | broken | kody-job-next-state present but missing lastRunISO/nextEligibleISO fields |
| docs-code | cto | 1h | broken | no kody-job-next-state block; state never created |
| docs-readme | cto | 1h | warn | no kody-job-next-state block; state never created; lastRunISO never persisted |
| flaky-test-quarantine | cto | 1h | warn (disabled) | no kody-job-next-state block; disabled=true so idle by design |
| health-check | cto | 1h | warn | no kody-job-next-state block; state never created |
| job-gap-scan | coo | 6h | broken | state at legacy .kody/jobs/ path; script writes to old location; two non-identical state files |
| pr-health-triage | cto | 1h | warn | no kody-job-next-state block; state never created |
| publish-release | ceo | 1d | warn (disabled) | no kody-job-next-state block; disabled=true so idle by design |
| qa-sweep | qa | 7d | broken | lastRunISO frozen at 2026-05-23; body updated 2026-05-28 but state not |
| qa-verify | qa | 15m | broken | state.json never created; 0 commits to state file ever |
| qa | qa | 15m | broken | lastRunISO frozen 2026-05-23; lastFiredAt and nextEligibleISO stale 10+ days |
| redispatch | coo | 15m | warn | no kody-job-next-state block; state never created |
| security-audit | cto | 7d | warn (disabled) | no kody-job-next-state block; disabled=true so idle by design |
| system-audit | coo | 6h | warn | no kody-job-next-state block; state never created |
| task-memory-extractor | coo | 6h | warn | no kody-job-next-state block; state never created |
| type-debt | cto | 1h | warn (disabled) | no kody-job-next-state block; state never created; disabled=true so idle by design |