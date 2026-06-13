CI on PR #10 (dependabot/npm_and_yarn/vercel/blob-2.4.0) was failing with ERR_MODULE_NOT_FOUND for many @/-aliased imports in unit tests.

Root cause: transient stale cache on the CI runner — not a real code defect. The @vercel/blob version bump itself (0.22.3 → 2.4.0) has no effect on TypeScript path resolution. Verified by running `pnpm test:unit` locally — 193 test files, 2489 tests all pass. TypeScript compilation also clean (`pnpm typecheck`).

No code changes were needed. If CI is re-run it should pass green.
