## Summary

Applied review feedback to PR #18 (dependabot npm dependency bumps).

### Changes Made

1. **Removed `@kody-ade/engine` from dependencies** (package.json line 110)
   - This deprecated package was pinning `@modelcontextprotocol/sdk` to 1.27.1 via transitive dependency
   - The `kody` script already uses `@kody-ade/kody-engine` (package.json line 8)

2. **Removed `@kody-ade/engine` from serverExternalPackages** (next.config.js line 57-59)
   - No longer needed since the package was removed

3. **Updated pnpm override for `@modelcontextprotocol/sdk`** (package.json line 219)
   - Changed from `">=1.25.2"` to `"^1.29.0"` to match the direct dependency version
   - This allows the SDK to resolve to 1.29.0 as specified in package.json

### Result

`@modelcontextprotocol/sdk` now correctly resolves to `1.29.0` (was 1.27.1).

### Verification

All quality gates passed: typecheck, lint, format:check, tests.
