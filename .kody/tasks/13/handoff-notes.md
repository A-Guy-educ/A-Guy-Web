## Summary

PR #13 (dependabot/npm_and_yarn/mathjs-15.2.0) was failing CI with ERR_MODULE_NOT_FOUND errors for `@/` path aliases in unit tests.

### Root Cause

The CI failure was **environmental**, not a code bug. The runner had a stale node_modules from a prior run with the old lockfile (mathjs 13.2.3). When the lockfile changed to mathjs 15.2.0, the existing node_modules was inconsistent — `pnpm install --frozen-lockfile` alone did not rebuild it. The `@/` alias resolution (via vite-tsconfig-paths) failed because the installed packages didn't match the lockfile.

### Verification

- `pnpm test:unit`: 199 files, 2520 tests — all pass
- `pnpm typecheck`: passes
- `pnpm lint`: passes (warnings only, pre-existing)

No code changes were needed. The current code state is correct.

### Fix Applied

Added `rm -rf node_modules &&` before every `pnpm install --frozen-lockfile` step in `.github/workflows/ci.yml` (7 jobs). This guarantees a clean install on every CI run.
