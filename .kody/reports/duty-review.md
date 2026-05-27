# Kody Duty Review

_Rolling 6h cycle — one duty deep-reviewed per tick._

## Cycle 1 — 1 healthy, 0 warn, 1 broken of 24 duties.

| Duty | Staff | Cadence | Verdict | Note |
|------|-------|---------|---------|------|
| approval-gate | cto | 15m | pending | not yet reviewed |
| architecture-audit | cto | 7d (disabled) | pending | not yet reviewed |
| ceo-performance-review | ceo | 7d | broken | state.json never created; report exists so duty ran, but promised state file was never persisted |
| cleanup-branches | coo | manual | pending | not yet reviewed |
| clear-empty-goals | — | 1d | pending | not yet reviewed |
| coverage-floor | kody | 1d (disabled) | pending | not yet reviewed |
| dead-code-sweep | kody | — (disabled) | pending | not yet reviewed |
| dependency-bump | kody | — (disabled) | pending | not yet reviewed |
| design-review | ux-designer | 7d | pending | not yet reviewed |
| docs-code | tech-writer | 1d | pending | not yet reviewed |
| docs-readme | tech-writer | 1d | pending | not yet reviewed |
| flaky-test-quarantine | kody | 1d (disabled) | pending | not yet reviewed |
| health-check | kody | 1d | pending | not yet reviewed |
| job-gap-scan | ceo | — | pending | not yet reviewed |
| pr-health-triage | cto | 15m | pending | not yet reviewed |
| publish-release | cto | manual | pending | not yet reviewed |
| qa | qa | 30m | pending | not yet reviewed |
| qa-sweep | qa | 1d | pending | not yet reviewed |
| qa-verify | qa | 30m | pending | not yet reviewed |
| redispatch | kody | 30m | pending | not yet reviewed |
| security-audit | cto | 1d | pending | not yet reviewed |
| system-audit | coo | 30m | pending | not yet reviewed |
| task-memory-extractor | coo | 30m | pending | not yet reviewed |
| type-debt | kody | — (disabled) | pending | not yet reviewed |

## This cycle

**ceo-performance-review** — _broken_

- **Goal clarity** — PASS: job states one concrete, checkable goal (weekly staff performance review graded on observable delivery evidence).
- **Procedure achieves goal** — PASS: enumerate staff → map duties → gather evidence → grade → build report → write report. All steps reachable and produce the intended output.
- **Cadence guard** — PASS: every: 7d frontmatter; body explicitly defers guard to the engine; no conflicting prose guard.
- **State contract** — PASS: state is emitted via job-tick submit_state mechanism (not a kody-job-next-state code fence in body, which is correct for this architecture).
- **One-action-max** — PASS: single PUT per tick to ceo-performance-review report.
- **Idempotence** — PASS: report body has no timestamp; no-change week produces byte-identical output.
- **Allowed-commands vs Restrictions** — PASS: gh repo view + gh api reads + gh api -X PUT to own report only. No internal contradiction.
- **Observed behavior** — BROKEN: ceo-performance-review.state.json does not exist (404). The report at .kody/reports/ceo-performance-review.md exists and shows a full grading table (last written 2026-05-27), confirming the duty ran and produced output. However, its promised state file was never persisted. This means either (a) the first tick completed the report write but failed to persist state, or (b) the state write path is misconfigured. The duty is producing output but not maintaining its state contract.