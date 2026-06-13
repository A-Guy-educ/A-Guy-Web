## CI Failure on PR #18 — Already Resolved

**Summary**: The "Fast Gate" CI failure on the dependabot PR was a pre-existing issue that was already fixed before investigation.

**Root Cause**: The failed CI run (`27202132585`, Jun 9 11:10 UTC) ran BEFORE the fix was merged. The fix (`39142bb31` — "fix(ci): Restore dependabot gates") added `retiredPayloadRuntimeTests` to `vitest.config.unit.mts` to exclude tests importing from source files removed in the Payload runtime cleanup.

**Evidence**:
- CI run `27256737794` (Jun 10 06:04 UTC, after the fix merged to dev) → **SUCCESS**
- `pnpm test:unit` locally on current HEAD → **SUCCESS**
- Current CI run `27312819557` is in progress and expected to pass

**Fix Already Applied**: Commit `39142bb31` added the `retiredPayloadRuntimeTests` exclusion list to `vitest.config.unit.mts`. No additional changes were needed.

**Follow-up**: Orphaned test files (`tests/unit/server/payload/plugins/mcp-auth.test.ts`, `tests/unit/server/repos/mcp/mcp-client.test.ts`, `tests/unit/server/repos/mcp/tool-allowlist.test.ts`) import from non-existent source modules. They should be deleted rather than kept as excluded dead code.
