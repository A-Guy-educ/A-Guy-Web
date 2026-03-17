# Plan: 260316-auto-648 — QA Implementation (Critical + High Priority)

## Rerun Context

This is a rerun (3rd attempt). The previous runs had no `plan.md`, `build.md`, or `review.md` in `prev-run/`, indicating the pipeline failed before producing outputs. The rerun feedback is generic ("Rerun requested via /cody rerun"). This plan is a fresh start built from the spec and thorough codebase research.

**Key differences from prior plan (from architect-events):**
- The prior plan had 10 steps. This plan consolidates to **8 steps** to reduce total surface area.
- **E2E cherry-pick (Step 4)** is REMOVED — the context.md confirms E2E tests already merged via PR #784.
- **Step 7 (high-traffic routes)**: Pragmatic approach — add `Sentry.captureException` to catch blocks instead of full `withApiHandler` migration, since these routes delegate to PayloadRequest-accepting endpoint functions. Full migration would require deep refactoring of downstream functions.
- **`vitest.config.unit.mts`**: Already has complete coverage config. Only CI workflow needs `--coverage` flag.
- **captureAndRespond import**: Use dynamic import pattern (`const { captureAndRespond } = await import(...)`) matching existing codebase convention (study-plan, chapters/by-grade, etc.).

## Research Findings

### File Paths Verified
- `next.config.js` ✅ exists (103 lines, NO `headers()` function — needs adding)
- `src/app/global-error.tsx` ✅ exists (48 lines — reference pattern for error boundary)
- `src/app/(cody)/cody/error.tsx` ✅ exists (48 lines — additional reference)
- `src/app/(frontend)/error.tsx` 🆕 will create
- `src/app/(frontend)/layout.tsx` ✅ exists (confirms route group)
- `src/infra/config/env-validation.ts` 🆕 will create
- `src/infra/config/server-init.ts` ✅ exists (reference for server-side init patterns)
- `instrumentation.ts` ✅ exists (13 lines, needs env validation hook)
- `src/infra/instrumentation-client.ts` ✅ exists (27 lines, missing browserTracingIntegration)
- `src/ui/cody/github-error-handler.ts` ✅ exists (127 lines, NO Sentry import — needs adding)
- `src/server/api/capture-and-respond.ts` ✅ exists (30 lines — pattern to reuse)
- `src/server/api/with-api-handler.ts` ✅ exists (117 lines — reference only, not migrating to it)
- `.github/workflows/ci.yml` ✅ exists (280 lines, `pnpm test:unit` on line 66 — needs `--coverage`)
- `vitest.config.unit.mts` ✅ exists (54 lines — already has full coverage config, NO changes needed)

### Patterns Observed
- **captureAndRespond usage**: Dynamic import pattern `const { captureAndRespond } = await import('@/server/api/capture-and-respond')` — used in study-plan, chapters/by-grade, exercises/convert/runner, chat-assets/finalize
- **Sentry.captureException**: Used directly in exercises/convert/queue, queue-v2 via `const Sentry = await import('@sentry/nextjs')` then `Sentry.captureException(error, ...)`
- **Error boundary**: `global-error.tsx` uses `html` + `body` wrapper (root-level). Nested error boundaries (`(cody)/cody/error.tsx`) do NOT include `html`/`body` tags.
- **next.config.js**: ESM format, uses `import`/`export`. Config wrapped by `withPayload()` then `withSentryConfig()`.
- **Sentry tunnel**: `tunnelRoute: '/monitoring'` in next.config.js means Sentry data goes to `/monitoring` not `*.sentry.io`. CSP connect-src just needs `'self'`.

### Integration Points
- `instrumentation.ts` register() runs at Node.js startup — env validation goes here
- `handleCodyApiError` is imported by 14+ Cody API routes — single Sentry addition covers all
- `next.config.js` → `nextConfig` object gets `headers` property added before `reactStrictMode`
- `src/infra/instrumentation-client.ts` → `integrations` array needs `Sentry.browserTracingIntegration()` added

## Reuse Inventory

### Existing Utilities (will reuse)
- `captureAndRespond` from `src/server/api/capture-and-respond.ts` — for 6 non-Cody routes
- `handleCodyApiError` from `src/ui/cody/github-error-handler.ts` — enhance with Sentry, covers 14+ Cody routes
- `Sentry.*` from `@sentry/nextjs` — already available project-wide
- `z` from `zod` — already imported in many files
- `logger` from `@/infra/utils/logger/logger` — already imported in most routes

### New Utilities (justification)
- `validateEnv()` from `src/infra/config/env-validation.ts` — NEW. No existing env validation exists anywhere in the codebase. Zod is the natural fit since it's already used for input validation.

---

## Step 1: Security Headers — next.config.js (Spec §1)

**Files to Touch:**
- `next.config.js` (MODIFIED — lines 10-82, insert `headers` function into `nextConfig` object)

**Exact Behavior:**
- Add `async headers()` function to `nextConfig` returning two header groups:
  1. **General routes (`/:path*`)** — Strict CSP:
     - `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' *.blob.vercel-storage.com img.youtube.com avatars.githubusercontent.com data:; font-src 'self'; connect-src 'self'; frame-src 'self' www.youtube.com; object-src 'none'; base-uri 'self'; form-action 'self'`
     - `X-Frame-Options: DENY`
     - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
     - `X-Content-Type-Options: nosniff`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
     - `X-DNS-Prefetch-Control: on`
  2. **Admin routes (`/admin/:path*`)** — Permissive CSP (Payload admin requires unsafe-eval):
     - Same headers as above EXCEPT `Content-Security-Policy` uses: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' *.blob.vercel-storage.com img.youtube.com avatars.githubusercontent.com data: blob:; font-src 'self' data:; connect-src 'self' *.sentry.io; frame-src 'self' www.youtube.com; object-src 'none'; base-uri 'self'; form-action 'self'`
- The `headers` property is placed inside the `nextConfig` object, after `redirects` (line 81).
- **Note**: Next.js applies headers in order — the more-specific `/admin/:path*` route overrides the general `/:path*` for admin paths.

**Tests (FAIL before, PASS after):**
- `tests/unit/infra/security-headers.spec.ts` (NEW):
  1. `next.config.js exports a config with headers() function` — imports next.config.js, verifies `headers` is a function
  2. `headers() returns array with general and admin route groups` — calls headers(), verifies 2 groups with correct `source` patterns
  3. `general CSP does NOT contain unsafe-eval` — verify strict CSP
  4. `admin CSP contains unsafe-eval` — verify admin permissive CSP
  5. `all required security headers are present` — verify X-Frame-Options, HSTS, etc.

**Acceptance Criteria:**
- [ ] `nextConfig` object has `headers` async function
- [ ] General routes have strict CSP (no unsafe-eval)
- [ ] Admin routes have permissive CSP (unsafe-eval, unsafe-inline)
- [ ] All 7 security headers present for both route groups
- [ ] `pnpm -s tsc --noEmit` passes

---

## Step 2: Frontend Error Boundary (Spec §2)

**Files to Touch:**
- `src/app/(frontend)/error.tsx` (NEW)

**Exact Behavior:**
- Create a Client Component error boundary for the `(frontend)` route group
- Mirror the `global-error.tsx` pattern but WITHOUT `<html>` / `<body>` wrapper (this is a nested error boundary, not root-level)
- `useEffect` → `Sentry.captureException(error)` to report to Sentry
- Locale-aware text: detect `navigator.language?.startsWith('he')` for Hebrew
- Content includes heading ("Something went wrong!" / "משהו השתבש!") and "Try again" / "נסה שוב" button
- "Try again" button calls `reset()`
- Tailwind styling consistent with design system (`bg-background`, `text-foreground`, Payload button classes)

**Tests (FAIL before, PASS after):**
- `tests/unit/frontend/error-boundary.spec.tsx` (NEW):
  1. `renders error heading and try again button` — render with mock error, verify heading text and button exist
  2. `calls Sentry.captureException with the error` — mock Sentry, verify called with error
  3. `calls reset when Try Again is clicked` — simulate click, verify reset() called

**Acceptance Criteria:**
- [ ] File exists at `src/app/(frontend)/error.tsx`
- [ ] Has `'use client'` directive
- [ ] Imports and uses `Sentry.captureException`
- [ ] Has locale detection for Hebrew/English
- [ ] Has reset button
- [ ] Does NOT wrap in `<html>` or `<body>` tags

---

## Step 3: Env Variable Validation + instrumentation.ts (Spec §3)

**Files to Touch:**
- `src/infra/config/env-validation.ts` (NEW)
- `instrumentation.ts` (MODIFIED — line 4-6, inside nodejs runtime block)

**Exact Behavior:**

**env-validation.ts:**
- Export `validateEnv()` function
- Use `z.object()` to define schema for:
  - **Required** (throw on missing): `DATABASE_URL`, `PAYLOAD_SECRET`, `BLOB_READ_WRITE_TOKEN` — `z.string().min(1)`
  - **Optional** (warn on missing): `SENTRY_DSN`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GITHUB_TOKEN` — `z.string().optional()`
  - **Public** (warn on missing): `NEXT_PUBLIC_SERVER_URL`, `NEXT_PUBLIC_SENTRY_DSN` — `z.string().optional()`
- For required vars: `safeParse(process.env)`, if error → throw with list of missing vars
- For optional vars: check individually with `console.warn` if empty
- For public vars: check individually with `console.warn` if empty

**instrumentation.ts:**
- Inside the `nodejs` runtime block (after the sentry import on line 5), add:
  ```
  const { validateEnv } = await import('./src/infra/config/env-validation')
  validateEnv()
  ```
- Note: `instrumentation.ts` is at project root; use relative path `./src/infra/config/env-validation` since tsconfig `@/` alias may not resolve in instrumentation context. Alternative: use direct relative path.

**Tests (FAIL before, PASS after):**
- `tests/unit/infra/env-validation.spec.ts` (NEW):
  1. `throws when DATABASE_URL is missing` — set process.env without DATABASE_URL, expect throw
  2. `throws when PAYLOAD_SECRET is missing` — same pattern
  3. `throws when BLOB_READ_WRITE_TOKEN is missing` — same pattern
  4. `does not throw when all required vars are set` — set all 3, expect no throw
  5. `warns when optional vars are missing` — spy on console.warn, verify warning messages

**Acceptance Criteria:**
- [ ] `validateEnv()` exported from new file
- [ ] Required vars throw on missing
- [ ] Optional vars warn but don't throw
- [ ] `instrumentation.ts` calls `validateEnv()` in nodejs runtime block
- [ ] Tests pass with `pnpm vitest run --config vitest.config.unit.mts tests/unit/infra/env-validation.spec.ts`

---

## Step 4: Enhance handleCodyApiError with Sentry (Spec §5a)

**Files to Touch:**
- `src/ui/cody/github-error-handler.ts` (MODIFIED — add import line 2, add Sentry call at line 75)

**Exact Behavior:**
- Add `import * as Sentry from '@sentry/nextjs'` at the top (after existing imports)
- Inside `handleCodyApiError()` function, add `Sentry.captureException(error, { tags: { route: routeName } })` at line 75 (after `const safeMessage` but before the if-chain)
- This single change fixes Sentry coverage for ALL 14+ Cody routes that use `handleCodyApiError`

**Tests (FAIL before, PASS after):**
- `tests/unit/cody-api-routes.spec.ts` already exists — add or verify test:
  1. `handleCodyApiError calls Sentry.captureException` — mock Sentry, call with generic Error, verify captureException called with tags

**Acceptance Criteria:**
- [ ] `import * as Sentry from '@sentry/nextjs'` added
- [ ] `Sentry.captureException(error, { tags: { route: routeName } })` called inside handleCodyApiError
- [ ] Existing tests still pass
- [ ] No regressions in Cody routes

---

## Step 5: Add captureAndRespond to 6 Non-Cody Routes (Spec §5b)

**Files to Touch:**
- `src/app/api/conversations/by-context/route.ts` (MODIFIED — catch blocks at lines 58, 120, 150)
- `src/app/api/blob/upload-token/route.ts` (MODIFIED — catch at line 153)
- `src/app/api/jobs/run-immediate/route.ts` (MODIFIED — catch at line 159)
- `src/app/api/pdfjs-viewer/route.ts` (MODIFIED — catch at line 111)
- `src/app/api/copilotkit/route.ts` (MODIFIED — catch at line 161)
- `src/app/api/agent/message/persist/route.ts` (MODIFIED — catch at line 116)

**Exact Behavior:**
For each route, replace the bare `catch → console.error/logger.error → NextResponse.json(500)` pattern with dynamic import of `captureAndRespond`:

```typescript
} catch (error) {
  const { captureAndRespond } = await import('@/server/api/capture-and-respond')
  return captureAndRespond(error, { route: '/api/<route-name> <METHOD>' })
}
```

**Route-specific notes:**
- **conversations/by-context**: Has 3 catch blocks (GET, POST, DELETE) — update all 3
- **blob/upload-token**: The outer catch at line 153 has no `error` param (bare `catch {}`). Add `error` param: `catch (error) {`
- **jobs/run-immediate**: Keep the inner try/catch for job status update, but add `captureAndRespond` before the final `return NextResponse.json(500)`. The inner catch for job status update stays as-is.
- **agent/message/persist**: Has a Zod error check. Keep the `if (error instanceof z.ZodError)` branch, add captureAndRespond in the else branch (for non-Zod errors).

**Tests (FAIL before, PASS after):**
- `tests/unit/api-sentry-coverage.spec.ts` (NEW):
  1. `captureAndRespond is called in conversations/by-context catch block` — verify file contains `captureAndRespond` import pattern
  2. `captureAndRespond is called in blob/upload-token catch block` — same
  3. `captureAndRespond is called in pdfjs-viewer catch block` — same
  4. (Static analysis tests: grep for `captureAndRespond` or `Sentry.captureException` in each file)

**Acceptance Criteria:**
- [ ] All 6 routes use `captureAndRespond` in their catch blocks
- [ ] `blob/upload-token` catch block now has `error` parameter
- [ ] `agent/message/persist` preserves Zod error check, adds Sentry for non-Zod
- [ ] `pnpm -s tsc --noEmit` passes
- [ ] `pnpm lint` passes

---

## Step 6: Add Sentry to 4 High-Traffic Routes (Spec §5c)

**Files to Touch:**
- `src/app/api/agent/chat/route.ts` (MODIFIED — catch at line 78)
- `src/app/api/agent/chat/stream/route.ts` (MODIFIED — catch at line 88)
- `src/app/api/exercises/import/route.ts` (MODIFIED — catch at line 48)
- `src/app/api/exercises/validate-answer/route.ts` (MODIFIED — catch at line 29)

**Exact Behavior:**
Add `Sentry.captureException(error, { tags: { route: '<route-path>' } })` to each route's catch block. Use dynamic import pattern for Sentry to keep these route files lightweight:

```typescript
} catch (error) {
  // existing logger.error stays
  const Sentry = await import('@sentry/nextjs')
  Sentry.captureException(error, { tags: { route: '/api/<route-name>' } })
  // existing NextResponse.json error return stays
}
```

**Important**: These routes delegate to PayloadRequest-accepting endpoint functions (`agentChat`, `agentChatStream`, `importExerciseFromLesson`, `validateAnswer`). Full `withApiHandler` migration is NOT feasible without refactoring those endpoint functions. The pragmatic approach is adding Sentry capture directly.

**Tests (FAIL before, PASS after):**
- Same test file `tests/unit/api-sentry-coverage.spec.ts` — add assertions:
  1. `agent/chat/route.ts contains Sentry.captureException` — file content check
  2. `agent/chat/stream/route.ts contains Sentry.captureException` — file content check
  3. `exercises/import/route.ts contains Sentry.captureException` — file content check
  4. `exercises/validate-answer/route.ts contains Sentry.captureException` — file content check

**Acceptance Criteria:**
- [ ] All 4 routes have `Sentry.captureException` in their catch blocks
- [ ] Existing error response behavior preserved (status codes, response body shape)
- [ ] `pnpm -s tsc --noEmit` passes

---

## Step 7: Zod Validation for 4 POST Routes + Sentry (Spec §6)

**Files to Touch:**
- `src/app/api/agent/conversation/route.ts` (MODIFIED — add Zod schema + Sentry)
- `src/app/api/agent/reset-chat/route.ts` (MODIFIED — add Zod schema + Sentry)
- `src/app/api/cody/tasks/route.ts` (MODIFIED — add Zod to POST handler)
- `src/app/api/cody/tasks/approve-review/route.ts` (MODIFIED — add Zod schema + Sentry)

**Exact Behavior:**

**agent/conversation** and **agent/reset-chat**:
- Add `import { z } from 'zod'` at top
- Define schema: `const bodySchema = z.object({ contextKey: z.string().min(1) })`
- Replace manual `if (!body.contextKey)` check with `const validated = bodySchema.parse(body)`
- Add `captureAndRespond` to the catch block for non-Zod errors
- Keep the Zod validation error as a 400 response

**cody/tasks POST**:
- Add Zod schema for the POST body (title, body, labels, etc.)
- Validate with `bodySchema.parse(body)` after parsing JSON
- Add `handleCodyApiError` for catch (it already has Sentry from Step 4)

**cody/tasks/approve-review**:
- Add `import { z } from 'zod'`
- Define schema: `const bodySchema = z.object({ prNumber: z.number().int().positive(), actorLogin: z.string().optional() })`
- Replace manual `if (!prNumber)` check with Zod validation
- Add `Sentry.captureException` in the catch block

**Tests (FAIL before, PASS after):**
- `tests/unit/api-zod-validation.spec.ts` (NEW):
  1. `agent/conversation returns 400 for missing contextKey` — call with empty body
  2. `agent/reset-chat returns 400 for missing contextKey` — call with empty body
  3. `cody/tasks/approve-review returns 400 for missing prNumber` — call with empty body

**Acceptance Criteria:**
- [ ] All 4 routes use Zod for input validation
- [ ] Invalid input returns structured 400 error
- [ ] Valid input passes through to existing logic
- [ ] Sentry capture added to catch blocks
- [ ] `pnpm -s tsc --noEmit` passes

---

## Step 8: CI Coverage + Web Vitals (Spec §7, §8)

**Files to Touch:**
- `.github/workflows/ci.yml` (MODIFIED — line 66)
- `src/infra/instrumentation-client.ts` (MODIFIED — line 21-26)

**Exact Behavior:**

**CI Coverage (ci.yml line 66):**
- Change `run: pnpm test:unit` to `run: pnpm test:unit -- --coverage`
- Add a new step after unit tests:
  ```yaml
  - name: Upload coverage report
    uses: actions/upload-artifact@v4
    if: always()
    with:
      name: coverage-report
      path: coverage/
      retention-days: 7
  ```

**Web Vitals (instrumentation-client.ts):**
- Add `Sentry.browserTracingIntegration()` to the `integrations` array alongside existing `Sentry.replayIntegration()`:
  ```typescript
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  ```
- This automatically captures LCP, FID/INP, CLS, TTFB, FCP at the existing `tracesSampleRate: 0.1` (10%).

**Tests (FAIL before, PASS after):**
- `tests/unit/infra/instrumentation-client.spec.ts` (NEW):
  1. `instrumentation-client includes browserTracingIntegration` — read file content, verify `browserTracingIntegration` string present
- CI coverage test: The `--coverage` flag is a workflow change, verified by CI run.

**Acceptance Criteria:**
- [ ] CI workflow runs tests with `--coverage`
- [ ] Coverage report uploaded as artifact
- [ ] `browserTracingIntegration()` in instrumentation-client integrations array
- [ ] `pnpm -s tsc --noEmit` passes
- [ ] `pnpm lint` passes
