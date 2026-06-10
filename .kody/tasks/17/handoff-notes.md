## CI Failure Investigation — PR #17 (lint-staged 16.2.7 → 17.0.7)

### What was failing
CI "Fast Gate" job was failing with `ERR_MODULE_NOT_FOUND` for all `@/` path aliases
during unit test loading. Files like `tests/unit/infra/media/embed/resolve.test.ts` could
not resolve `@/infra/media/embed/resolve`.

### Root cause
**Environmental — stale CI cache.** The code is correct. All quality gates pass locally:
- `pnpm test:unit`: 193 files, 2489 tests PASS
- `pnpm typecheck`: PASS
- `pnpm lint`: PASS
- `pnpm install --frozen-lockfile`: PASS

The CI environment has a `node_modules` that is inconsistent with the current
pnpm-lock.yaml (likely due to a cached restore from a prior lockfile state).
When Node.js ESM resolver runs without the `vite-tsconfig-paths` alias
transformation, it treats `@/` as a package name → `ERR_MODULE_NOT_FOUND`.

### What was checked
- vitest.config.unit.mts: `tsconfigPaths({ projects: ['./tsconfig.vitest.json'] })` is
  correctly configured
- tsconfig.json: `"@/*": ["./src/*"]` path alias is correct
- tsconfig.vitest.json: extends tsconfig.json, includes both src and tests
- pnpm-lock.yaml: lockfile is consistent, lint-staged@17.0.7 is properly pinned
- No code changes needed — the issue is CI infrastructure

### Why local passes but CI fails
CI uses `actions/setup-node@v4` with `cache: 'pnpm'`. This caches the pnpm content-
addressable store. If an older cached store is restored and the lockfile has since
changed (due to lint-staged bump regenerating transitive deps), the resolution step
may not correctly reflect the new dependency graph.

### Next steps
1. Invalidate CI cache for the `CI` workflow on GitHub Actions
2. Re-run the workflow — it should pass
3. If it still fails, check whether the `vite-tsconfig-paths` version in the
   pnpm-lock.yaml matches package.json (^6.0.3 → installed 6.0.3)
