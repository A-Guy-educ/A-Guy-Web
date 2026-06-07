# CI Fix for #1573 — Kody Task

## What was done

1. **Prettier formatting in `kody.config.json`** — `pnpm format -- kody.config.json` fixed the CI failure.

2. **Time-sensitive Hebrew date test** — `tests/unit/ui/web/chat/utils/format-message-time.test.ts` used `twoDaysAgo` which from June 3, 2026 returned June 1 (ביוני) instead of May (במאי). Fixed by hardcoding May 15, 2026: `new Date(2026, 4, 15, 10, 0, 0)`.

3. **Stale `src/payload-types.ts`** — regenerated via `PAYLOAD_SECRET=test-payload-secret-for-unit-tests-only-not-real pnpm generate:types` and staged.

## Root cause

The CI "Fast Gate" step failed because `pnpm format:check` found Prettier formatting issues in `kody.config.json`. A secondary time-sensitive test failure was also fixed.

## Verification

`mcp__kody-verify__verify` passed on attempt 2 with no failures.
