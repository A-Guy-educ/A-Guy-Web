# Gap Analysis: 260316-auto-648

## Summary

- Gaps Found: 2
- Spec Revised: Yes

## Gaps Found

### Gap 1: Vitest Coverage Config Already Exists

**Severity:** Medium
**Location:** `vitest.config.unit.mts`
**Issue:** The task (Phase 3, Item 7) states to "Add `coverage` section to `vitest.config.unit.mts`" with provider 'v8' and thresholds. However, the coverage configuration already exists in the file (lines 26-52) with:
- provider: 'v8'
- reporter: ['text', 'html', 'lcov']
- thresholds: statements: 30, branches: 25, functions: 30

**Fix Applied:** Updated spec acceptance criteria to clarify that vitest config already has coverage but CI workflow needs --coverage flag. Changed FR-009 to focus on CI workflow changes only.

### Gap 2: Missing Browser Tracing Integration

**Severity:** High
**Location:** `src/infra/instrumentation-client.ts`
**Issue:** The task (Phase 3, Item 8) says to add `Sentry.browserTracingIntegration()` to instrumentation-client.ts. The file exists and has Sentry.init() with replayIntegration, but browserTracingIntegration is NOT present. This is correctly identified in the spec but needs verification.

**Fix Applied:** No spec change needed - this is correctly covered in FR-010. Verified the gap exists by reading the file.

## Changes Made to Spec

- **Updated FR-009**: Clarified that vitest.config.unit.mts already has coverage config, but the CI workflow (`pnpm test:unit`) needs to add the `--coverage` flag
- **Clarified Acceptance Criteria**: Added detail that coverage config exists in vitest but needs CI integration

## No Other Gaps Found

After exploring the codebase, all other spec items correctly identify gaps that need to be addressed:

1. **Security Headers** (FR-001): `next.config.js` exists but has no `headers()` function - CORRECT
2. **Frontend Error Boundary** (FR-002): `src/app/(frontend)/error.tsx` doesn't exist - CORRECT
3. **Env Validation** (FR-003): `src/infra/config/env-validation.ts` doesn't exist - CORRECT
4. **instrumentation.ts** (FR-003): Currently doesn't call any env validation - CORRECT
5. **handleCodyApiError** (FR-005): Uses console.error, no Sentry - CORRECT (verified at `src/ui/cody/github-error-handler.ts`)
6. **API routes without Sentry** (FR-006): The 6 routes listed have console.error but no Sentry - CORRECT
7. **4 routes to migrate** (FR-007): Verified they don't use withApiHandler - CORRECT
8. **Routes needing Zod** (FR-008): Verified they use manual field checks - CORRECT
9. **Web Vitals** (FR-010): Verified browserTracingIntegration missing - CORRECT
10. **E2E Cherry-pick**: Verification folder doesn't exist at `tests/e2e/verification/` - CORRECT

## Verification of Key Files

| File | Current State | Gap |
|------|--------------|-----|
| `next.config.js` | No headers() function | Missing security headers |
| `src/app/(frontend)/error.tsx` | Doesn't exist | Needs creation |
| `src/infra/config/env-validation.ts` | Doesn't exist | Needs creation |
| `instrumentation.ts` | Only imports sentry configs | Needs env validation call |
| `src/infra/instrumentation-client.ts` | Has replayIntegration only | Missing browserTracingIntegration |
| `src/ui/cody/github-error-handler.ts` | Uses console.error | Missing Sentry |
| `vitest.config.unit.mts` | Has full coverage config | CI needs --coverage flag |
| `.github/workflows/ci.yml` | No coverage flag in test:unit | Needs --coverage flag |
| `tests/e2e/verification/` | Doesn't exist | Needs cherry-pick |

## Conclusion

The spec is mostly accurate. The main finding is that vitest.config.unit.mts already has comprehensive coverage configuration (which contradicts the task description that says to add it), but the CI workflow doesn't pass the --coverage flag to enable it.
