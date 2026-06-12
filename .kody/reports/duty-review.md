# Kody Duty Review
_Rolling 6h cycle — one duty deep-reviewed per tick._

Cycle 17 — 1 healthy, 8 warn, 16 broken of 25 duties.

| Duty | Staff | Cadence | Verdict | Note |
|------|-------|---------|---------|------|
| approval-gate | cto | 15m | broken | state file never created; kody-job-next-state block described but never persisted |
| architecture-audit | cto | 7d (disabled) | broken | script never implemented; body references deprecated .kody/jobs/ path; no kody-job-next-state block in procedure |
| ceo-performance-review | ceo | 7d | broken | kody-job-next-state block never emitted by procedure; state file never created |
| cleanup-branches | coo | manual | healthy | passes every check |
| clear-empty-goals | — | 1d | broken | 0-step body; no kody-job-next-state block; state file never created |
| coverage-floor | kody | 1d (disabled) | broken | script absent (404); cadence formula inconsistency (every: 1d vs +20h); no kody-job-next-state block in procedure |
| dead-code-sweep | kody | 30d (disabled) | broken | script never implemented; state at legacy .kody/jobs/ path |
| dependency-bump | kody | 7d (disabled) | broken | script absent; body references deprecated .kody/jobs/ path |
| design-review | ux-designer | 7d | broken | cadence guard (6d) contradicts every: 7d; no kody-job-next-state block |
| dev-ci-health | cto | 15m | broken | kody-job-next-state present but missing lastRunISO/nextEligibleISO fields |
| docs-code | tech-writer | 1d | broken | no kody-job-next-state block; state never created |
| docs-readme | tech-writer | 1d | warn | no kody-job-next-state block; state never created; lastRunISO never persisted |
| flaky-test-quarantine | kody | 1d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| health-check | kody | 1d | warn | no kody-job-next-state block; state never created |
| job-gap-scan | ceo | — | broken | state at legacy .kody/jobs/ path; script writes to old location; two non-identical state files |
| pr-health-triage | cto | 15m | warn | no kody-job-next-state block; state never created |
| publish-release | cto | manual | warn | no kody-job-next-state block; disabled=true so idle by design |
| qa-sweep | qa | 1d | broken | lastRunISO frozen at 2026-05-23; body updated 2026-05-28 but state not |
| qa-verify | qa | 30m | broken | state.json never created; 0 commits to state file ever |
| qa | qa | 30m | broken | lastRunISO frozen 2026-05-23; lastFiredAt and nextEligibleISO stale 10+ days |
| redispatch | kody | 30m | warn | no kody-job-next-state block; state never created |
| security-audit | cto | 1d | warn | no kody-job-next-state block; disabled=true so idle by design |
| system-audit | coo | 30m | warn | no kody-job-next-state block; state never created |
| task-memory-extractor | coo | 30m | warn | no kody-job-next-state block; state never created |
| type-debt | kody | 7d (disabled) | warn | no kody-job-next-state block; state never created; disabled=true so idle by design |