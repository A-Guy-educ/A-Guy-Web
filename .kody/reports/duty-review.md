# Kody Duty Review

_Rolling 6h cycle — one duty deep-reviewed per tick._

Cycle 17 — 1 healthy, 16 warn, 8 broken of 25 duties.

| Duty | Staff | Cadence | Verdict | Note |
|------|-------|---------|---------|------|
| approval-gate | cto | 15m | broken | state file never created (0 commits); cadence guard absent from body despite every: 15m frontmatter |
| architecture-audit | ceo | 7d | broken | script never implemented (404); body references deprecated .kody/jobs/ path; no kody-job-next-state block in procedure |
| ceo-performance-review | ceo | 1d | broken | kody-job-next-state block never emitted by procedure; state file never created |
| cleanup-branches | coo | 1d | healthy | passes every check |
| clear-empty-goals | ceo | 1d | broken | 0-step body; no kody-job-next-state block; state file never created |
| coverage-floor | ceo | 1d (disabled) | broken | script absent (404); cadence formula inconsistency (every: 1d vs +20h); no kody-job-next-state block in procedure; disabled=true so idle by design |
| dead-code-sweep | ceo | 1d | broken | script never implemented; state at legacy .kody/jobs/ path |
| dependency-bump | ceo | 7d | broken | script absent; body references deprecated .kody/jobs/ path |
| design-review | ceo | 7d | broken | cadence guard (6d) contradicts every: 7d; no kody-job-next-state block |
| dev-ci-health | coo | 15m | broken | kody-job-next-state present but missing lastRunISO/nextEligibleISO fields |
| docs-code | ceo | 7d | broken | no kody-job-next-state block; state never created |
| docs-readme | ceo | 7d | warn | no kody-job-next-state block; state never created; lastRunISO never persisted |
| flaky-test-quarantine | qa | 7d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| health-check | ceo | 1d | warn | no kody-job-next-state block; state never created |
| job-gap-scan | ceo | 7d | broken | state at legacy .kody/jobs/ path; script writes to old location; two non-identical state files |
| pr-health-triage | coo | 1d | warn | no kody-job-next-state block; state never created |
| publish-release | ceo | 30d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| qa-sweep | qa | 7d | broken | lastRunISO frozen at 2026-05-23; body updated 2026-05-28 but state not |
| qa-verify | qa | 1d | broken | state.json never created; 0 commits to state file ever |
| qa | qa | 7d | broken | lastRunISO frozen 2026-05-23; lastFiredAt and nextEligibleISO stale 10+ days |
| redispatch | ceo | 1h | warn | no kody-job-next-state block; state never created |
| security-audit | ceo | 7d (disabled) | warn | no kody-job-next-state block; disabled=true so idle by design |
| system-audit | ceo | 1h | warn | no kody-job-next-state block; state never created |
| task-memory-extractor | ceo | 7d | warn | no kody-job-next-state block; state never created |
| type-debt | ceo | 7d (disabled) | warn | no kody-job-next-state block; state never created; disabled=true so idle by design