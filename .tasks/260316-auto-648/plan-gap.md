# Plan Gap Analysis: 260316-auto-648

## Summary

- Gaps Found: 3
- Plan Revised: Yes (1 line number fix in plan.md, 3 fixes in spec.md)

## Gaps Identified

### Gap 1: Spec/Plan Misalignment — withApiHandler vs Sentry.captureException for High-Traffic Routes

**Severity:** High
**Issue:** Spec §5c and AC #7 state "Migrate 4 routes to withApiHandler" but Plan Step 6 explicitly chooses a pragmatic approach: add `Sentry.captureException` directly instead of full `withApiHandler` migration. The plan documents the rationale (downstream functions accept `PayloadRequest` objects, making full migration require deep refactoring), but the spec was not updated to match.
**Fix Applied:** Updated spec.md §5c to read "Add Sentry.captureException to 4 routes (pragmatic approach)" and updated AC #7 to "4 high-traffic routes have Sentry.captureException in catch blocks". No plan change needed — plan's pragmatic approach is sound.

### Gap 2: Spec/Plan Misalignment — E2E Cherry-pick Already Done

**Severity:** Medium
**Issue:** Spec §4 says "Cherry-pick commit 9631fe7b" and AC #4 says "E2E test helpers are available", but the E2E tests and helpers already exist in the codebase (merged via PR #784). The plan correctly removed this step, but the spec was not updated.
**Fix Applied:** Updated spec.md §4 to mark the cherry-pick as already done and AC #4 to reflect this. Verified all 3 helper files (`tests/e2e/helpers/admin.ts`, `exercise-builders.ts`, `verification-fixtures.ts`) and 8 verification spec files exist.

### Gap 3: Plan Line Number Error — agent/message/persist/route.ts

**Severity:** Low
**Issue:** Plan Step 5 says the catch block in `agent/message/persist/route.ts` is at line 116, but the actual `catch (error) {` is at line 111. Line 116 is the `reqLogger.error` call inside the catch block.
**Fix Applied:** Updated plan.md Step 5 to reference line 111 instead of line 116.

## Feasibility Assessment

### File Paths Verified

All file paths in the plan were verified against the codebase:

| File | Plan Status | Actual Status |
|------|-------------|---------------|
| `next.config.js` | MODIFIED | ✅ Exists, no `headers()` — needs change |
| `src/app/(frontend)/error.tsx` | NEW | ✅ Does not exist — needs creation |
| `src/infra/config/env-validation.ts` | NEW | ✅ Does not exist — needs creation |
| `instrumentation.ts` | MODIFIED | ✅ Exists (13 lines) |
| `src/ui/cody/github-error-handler.ts` | MODIFIED | ✅ Exists (127 lines), NO Sentry |
| `src/server/api/capture-and-respond.ts` | REUSE | ✅ Exists (30 lines), has Sentry |
| `src/infra/instrumentation-client.ts` | MODIFIED | ✅ Exists (27 lines), missing browserTracingIntegration |
| `.github/workflows/ci.yml` | MODIFIED | ✅ Exists, `pnpm test:unit` at line 66 |
| `vitest.config.unit.mts` | NO CHANGE | ✅ Already has full coverage config |
| 6 non-Cody route files | MODIFIED | ✅ All exist, none have captureAndRespond |
| 4 high-traffic route files | MODIFIED | ✅ All exist, none have Sentry |
| 4 Zod validation route files | MODIFIED | ✅ All exist, none have Zod |

### Catch Block Line Numbers Verified

| Route | Plan Line | Actual Line | Status |
|-------|-----------|-------------|--------|
| conversations/by-context (GET) | 58 | 58 | ✅ |
| conversations/by-context (POST) | 120 | 120 | ✅ |
| conversations/by-context (DELETE) | 150 | 150 | ✅ |
| blob/upload-token (outer) | 153 | 153 | ✅ |
| jobs/run-immediate | 159 | 159 | ✅ |
| pdfjs-viewer | 111 | 111 | ✅ |
| copilotkit | 161 | 161 | ✅ |
| agent/message/persist | ~~116~~ → 111 | 111 | ✅ Fixed |
| agent/chat | 78 | 78 | ✅ |
| agent/chat/stream | 88 | 88 | ✅ |
| exercises/import | 48 | 48 | ✅ |
| exercises/validate-answer | 29 | 29 | ✅ |

### Import Path Validation

- **instrumentation.ts**: Plan uses `await import('./src/infra/config/env-validation')`. Existing pattern in the same file uses `await import('./sentry.server.config')` — relative paths, not `@/` aliases. This is correct since `instrumentation.ts` runs outside the Next.js bundler pipeline where path aliases may not resolve.
- **captureAndRespond dynamic import**: Plan uses `await import('@/server/api/capture-and-respond')`. Existing pattern in study-plan, chapters/by-grade, etc. uses the same. ✅

### Step Ordering Verified

- Steps 1-3 are independent (security headers, error boundary, env validation) — no dependency issues.
- Step 4 (enhance handleCodyApiError with Sentry) must come before Step 7 (cody/tasks uses handleCodyApiError) — ordering is correct.
- Steps 5-6 are independent of each other.
- Step 8 (CI + Web Vitals) is independent.
- No circular dependencies detected.

### Test Commands Verified

- Plan uses `pnpm vitest run --config vitest.config.unit.mts` — correct for this project.
- Plan uses `pnpm -s tsc --noEmit` — correct.
- Plan uses `pnpm lint` — correct.

## Reuse Corrections

No reuse issues found. The plan correctly:
- Reuses `captureAndRespond` from `src/server/api/capture-and-respond.ts`
- Reuses `handleCodyApiError` from `src/ui/cody/github-error-handler.ts`
- Does NOT create unnecessary new utilities (only `validateEnv()` which doesn't exist)
- Does NOT modify `vitest.config.unit.mts` (already has coverage config)

## Changes Made to Plan

- **Step 5**: Fixed `agent/message/persist/route.ts` catch line reference from 116 → 111

## Changes Made to Spec

- **§4**: Marked E2E cherry-pick as already done (PR #784)
- **§5c**: Changed from "Migrate 4 routes to withApiHandler" to "Add Sentry.captureException to 4 routes"
- **AC #4**: Struck through, marked as already done
- **AC #7**: Changed from "use withApiHandler" to "have Sentry.captureException in catch blocks"
