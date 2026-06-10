Fixed the failing Fast Gate CI step on PR #8.

**Root cause**: Dependabot updated package.json with newer versions of vite-tsconfig-paths and vitest, but pnpm-lock.yaml was left stale. CI runs `pnpm install --frozen-lockfile`, which installed the old versions (6.0.3 / 4.0.16). The old vite-tsconfig-paths has a regression resolving @/ TypeScript path aliases in unit tests, causing ERR_MODULE_NOT_FOUND on @/ imports.

**Fix**: Ran `pnpm install --no-frozen-lockfile` to sync the lock file with the updated package.json. Tests then passed (2487 passed, 10 skipped, 193 files).

**Verification**: mcp__kody-verify__verify returned ok=true with no failures.

**Remaining risk**: Dependabot PRs for dev dependencies will hit this again unless the lock file is updated or CI is adjusted to skip --frozen-lockfile for dependabot branches.
