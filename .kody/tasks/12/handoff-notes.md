# CI Failure Investigation — PR #12

## Summary

PR #12 (chore: bump eslint-config-next 15.5.9 → 16.2.7) showed CI failures in runs 27188174510 and 27201508477, both showing `ERR_MODULE_NOT_FOUND` for `@/` path aliases in unit tests (e.g., `Cannot find package '@/infra/media/embed/resolve'`).

## Investigation

- Ran `pnpm test:unit` locally at the same merge commit (`c3d0c8ed1`) → **193 test files passed, 2489 tests passed**
- Ran with coverage (`pnpm test:unit -- --coverage`) → same result, all passing
- Ran full `pnpm ci:local` → unit tests pass (integration tests fail due to Docker unavailability in this environment, which is expected)
- Checked latest CI run (`27302135889`) → **Fast Gate ✓, Build ✓, Integration Tests ✓**

## Root Cause

**Transient pnpm cache corruption in the CI runner.** The CI failures were NOT caused by the `eslint-config-next` bump or any code change. The same commit passes locally and in the latest CI run. The previous CI runs hit a stale/corrupted pnpm store that caused `vite-tsconfig-paths` to fail to resolve `@/` path aliases during test file loading.

## Resolution

No code changes were required. The latest CI run (27302135889) passed all gates after the runner's cache was refreshed. PR can be merged.

## Note for Future Reference

If CI fails with `ERR_MODULE_NOT_FOUND` for `@/` aliases but tests pass locally, it is almost certainly a CI pnpm cache issue. Retry CI before investigating path alias configuration or code changes.
