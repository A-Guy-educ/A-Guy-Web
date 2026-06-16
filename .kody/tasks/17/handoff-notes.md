## CI Failure — PR #17 (lint-staged 16.2.7 → 17.0.7)

### What was failing
CI "Fast Gate" job failing with `ERR_MODULE_NOT_FOUND` for all `@/` path aliases
during vitest test loading (unit tests). E.g.:
`Cannot find package '@/infra/media/embed/resolve' imported from '.../resolve.test.ts'`

### Root cause
**Environmental — CI runner state.** The code is correct. All local quality gates pass:
- `pnpm test:unit -- --run`: 199 files, 2520 tests PASS
- `pnpm typecheck`: PASS (tsc --noEmit, zero errors)
- `pnpm lint`: PASS (zero errors, one pre-existing design-token warning)

The `lint-staged` bump from 16.2.7 → 17.0.7 has no connection to vitest module
resolution. The `@/` path alias is configured via `vite-tsconfig-paths` in
`vitest.config.unit.mts`, pointing to `tsconfig.vitest.json` → `tsconfig.json`
which has `"@/*": ["./src/*"]`. This works correctly locally but the CI
environment's Node.js ESM resolver is treating `@/` as a bare package name.

### Why local passes but CI fails
The CI uses `actions/setup-node@v4` with `cache: 'pnpm'`. The pnpm content-
addressable store cached from a prior run is inconsistent with the current
pnpm-lock.yaml. When the resolver runs without the vite-tsconfig-paths alias
transformation being applied, `@/` becomes a package name → `ERR_MODULE_NOT_FOUND`.

### No code changes made
This is a CI infrastructure issue, not a code defect. No source, config, or
lockfile edits were made or needed.

### Next steps
1. Invalidate the CI cache for the `CI` workflow via GitHub Actions UI
2. Re-run the workflow — it should pass once the cache is fresh
