## Root Cause

The `install-with-cleanup` composite action (new in this PR: deletes `node_modules`, then runs `pnpm install --frozen-lockfile`) was exposing a failure mode where `vite-tsconfig-paths` silently failed to resolve `@/` path aliases in the CI environment. All test files that imported from `@/...` paths failed with `ERR_MODULE_NOT_FOUND`.

The tsconfig (`tsconfig.json`) defines `"@/*": ["./src/*"]`, and `vite-tsconfig-paths` with `projects: ['./tsconfig.vitest.json']` should have resolved these — but it failed silently in CI after `node_modules` was deleted and reinstalled.

## Fix

Added explicit `resolve.alias` for `@` directly in both Vitest config files, bypassing the tsconfig-reading plugin path. This is a belt-and-suspenders approach: both `vite-tsconfig-paths` (tsconfig-based) and `resolve.alias` (Vite-native) now handle the `@/` alias.

Files changed:
- `vitest.config.unit.mts` — added `srcDir` constant and `resolve: { alias: { '@': srcDir } }`
- `vitest.config.mts` — same

The fix was verified with `mcp__kody-verify__verify` (typecheck + lint + tests all pass).
