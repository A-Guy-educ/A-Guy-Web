Applied the review feedback to PR #6 (bump pnpm/action-setup from v4 to v6).

The correctness reviewer flagged that four workflow files upgraded to `@v6` without pinning an explicit pnpm version, while the other four files in the same PR pin `version: '10.33.0'`. With action-setup@v6 adding pnpm v11 support, the unversioned workflows would implicitly use pnpm v11 — inconsistent with the project's established convention.

Fixed by adding `with: version: '10.33.0'` to:
- `.github/workflows/ai-docs-refresh.yml`
- `.github/workflows/atlas-integration.yml`
- `.github/workflows/repo-hygiene-report.yml`
- `.github/workflows/vercel-deploy.yml`

No other changes were made. Verify passed cleanly (typecheck, lint, tests).
