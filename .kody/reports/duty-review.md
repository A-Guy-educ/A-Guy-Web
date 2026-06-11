# Kody Duty Review

_Rolling 6h cycle — one duty deep-reviewed per tick._

Cycle 17 — 1 healthy, 9 warn, 16 broken of 26 duties.

| Duty | Staff | Cadence | Verdict | Note |
|------|-------|---------|---------|------|
| approval-gate | cto | 15m | broken | state.json never created; procedure cannot persist per-PR stage |
| architecture-audit | cto | 7d | broken | script never implemented (404); body references deprecated .kody/jobs/ path; no kody-job-next-state block in procedure |
| ceo-performance-review | ceo | 30d | broken | kody-job-next-state block never emitted by procedure; state file never created |
| cleanup-branches | dev-infra | 3d | healthy | passes every check |
| clear-empty-goals | ceo | 7d | broken | 0-step body; no kody-job-next-state block; state file never created |
| coverage-floor | dev-infra | 1d (disabled) | broken | script absent (404); cadence formula inconsistency (every: 1d vs +20h); no kody-job-next-state block in procedure |
| dead-code-sweep | dev-infra | 7d | broken | script never implemented; state at legacy .kody/jobs/ path |
| dependency-bump | dev-infra | 14d | broken | script absent; body references deprecated .kody/jobs/ path |
| design-review | cto | 7d | broken | cadence guard (6d) contradicts every: 7d; no kody-job-next-state block |
| dev-ci-health | dev-infra | 2h | broken | kody-job-next-state present but missing lastRunISO/nextEligibleISO fields |
| docs-code | dev-infra | 14d | broken | no kody-job-next-state block; state never created |
| docs-readme | dev-infra | 14d | warn | no kody-job-next-state block; state never created; lastRunISO never persisted |
| flaky-test-quarantine | qa | 7d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| health-check | cto | 6h | warn | no kody-job-next-state block; state never created |
| job-gap-scan | dev-infra | 7d | broken | state at legacy .kody/jobs/ path; script writes to old location; two non-identical state files |
| pr-health-triage | cto | 2h | warn | no kody-job-next-state block; state never created |
| publish-release | cto | 30d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| qa-sweep | qa | 7d | broken | lastRunISO frozen at 2026-05-23; body updated 2026-05-28 but state not |
| qa-verify | qa | 7d | broken | state.json never created; 0 commits to state file ever |
| qa | qa | 7d | broken | lastRunISO frozen 2026-05-23; lastFiredAt and nextEligibleISO stale 10+ days |
| redispatch | cto | 15m | warn | no kody-job-next-state block; state never created |
| security-audit | cto | 30d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| system-audit | dev-infra | 6h | warn | no kody-job-next-state block; state never created |
| task-memory-extractor | cto | 7d | warn | no kody-job-next-state block; state never created |
| type-debt | dev-infra | 7d (disabled) | warn | no kody-job-next-state block; state never created; disabled=true so idle by design