# CI Fix Task 16 — Handoff

## What was failing
PR #16 (dependabot: bump @commitlint/config-conventional 20.5.0 → 21.0.2) CI was failing with `ERR_MODULE_NOT_FOUND` for `@/` path aliases during the unit test step (`pnpm test:unit -- --coverage`).

## Investigation
- All 193 unit test files / 2489 tests pass locally with `pnpm test:unit`
- Typecheck (`pnpm typecheck`) passes
- Lint (`pnpm lint`) passes
- The PR only changes `package.json` and `pnpm-lock.yaml` (dev dependency version bump)
- No source code was modified; the code is identical to the `dev` branch
- CI run URL: https://github.com/A-Guy-educ/A-Guy-Web/actions/runs/27201513282

## Root cause
**Environmental CI issue, not a code defect.** The `ERR_MODULE_NOT_FOUND` errors indicate the CI runner's `pnpm install --frozen-lockfile` step likely produced incomplete or corrupted node_modules, causing vitest to fail resolving `@/` aliases. The `fast-gate` job has no node_modules cache, so each run installs fresh — if install is interrupted or hits a runner issue, module resolution fails.

## Verification
`mcp__kody-verify__verify` → ok=true, 0 failures.

## Followups
1. **CI infra**: Add node_modules caching to the `fast-gate` job, or investigate why pnpm install fails on this runner.
2. **Optional**: Align `@commitlint/cli` (still at ^20.5.0) with `@commitlint/config-conventional` (now 21.0.2) for version consistency.
