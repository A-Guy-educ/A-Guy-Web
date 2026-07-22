## Handoff: CI transient failure investigation

### What happened
CI run `27201511693` on PR #14 (`dependabot/npm_and_yarn/cross-env-10.1.0`) failed during the unit test step with `ERR_MODULE_NOT_FOUND` for all `@/` path alias imports (e.g., `Cannot find package '@/infra/media/embed/resolve'`).

### Investigation findings
- **Subsequent CI run `27256230573` passed** with no code changes — confirmed transient failure, not a code bug.
- A third run `27302123491` was triggered and is currently in progress.
- Unit tests pass locally (`pnpm test:unit -- --run` → 193 files, 2489 tests passed).
- Typecheck passes locally (`pnpm typecheck` → no errors).
- CI was passing on `dev` before this PR (runs 27302144306, 27301892394, 27299052694 all succeeded).

### Root cause
Likely a CI runner infrastructure issue — possibly incomplete node_modules installation, pnpm store corruption, or a network glitch during `pnpm install --frozen-lockfile` in the first run. The `@/` path alias resolution via `vite-tsconfig-paths` is working correctly; the failure was environmental, not code-related.

### No code changes needed
The `cross-env` bump (7.0.3 → 10.1.0) is unrelated to path alias resolution. Tests that were excluded via `retiredPayloadRuntimeTests` are excluded for a reason and also not affected.
