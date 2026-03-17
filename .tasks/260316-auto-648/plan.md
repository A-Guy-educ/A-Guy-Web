# QA Implementation Plan - Implementation Steps

## Phase 1: Critical Items

### Step 1: Security Headers (next.config.js)
1. Read existing next.config.js
2. Add async headers() function
3. Implement split CSP strategy:
   - All routes: strict CSP with self, Vercel Blob, YouTube, Sentry tunnel
   - Admin routes: permissive CSP with unsafe-eval, unsafe-inline
4. Add all required headers (HSTS, X-Frame-Options, etc.)

### Step 2: Frontend Error Boundary (src/app/(frontend)/error.tsx)
1. Read src/app/global-error.tsx as reference
2. Read src/app/(cody)/cody/error.tsx as reference
3. Create new error.tsx with:
   - 'use client' directive
   - Sentry.captureException in useEffect
   - Locale detection (navigator.language)
   - Reset button with reset() call
   - Tailwind styling

### Step 3: Env Variable Validation
1. Create src/infra/config/env-validation.ts with Zod schema
2. Define required/optional/public env var schemas
3. Read instrumentation.ts
4. Add validateEnv() call in register() function for nodejs runtime

### Step 4: Pre-launch E2E Cherry-pick
1. Run: git cherry-pick 9631fe7b
2. If conflicts: resolve manually, keep dev branch patterns
3. Verify test files exist in tests/e2e/

## Phase 2: Sentry Coverage

### Step 5a: Find and Enhance handleCodyApiError
1. Search for handleCodyApiError in codebase
2. Add Sentry.captureException call to the utility

### Step 5b: Add captureAndRespond to 6 Routes
For each route:
1. Read current route file
2. Import captureAndRespond
3. Replace catch block to call captureAndRespond

Routes:
- src/app/api/conversations/by-context/route.ts
- src/app/api/blob/upload-token/route.ts
- src/app/api/jobs/run-immediate/route.ts
- src/app/api/pdfjs-viewer/route.ts
- src/app/api/copilotkit/route.ts
- src/app/api/agent/message/persist/route.ts

### Step 5c: Migrate 4 Routes to withApiHandler
For each route:
1. Read current route implementation
2. Create Zod schema for input validation
3. Migrate to use withApiHandler wrapper
4. Remove manual field checks

Routes:
- src/app/api/agent/chat/route.ts
- src/app/api/agent/chat/stream/route.ts
- src/app/api/exercises/import/route.ts
- src/app/api/exercises/validate-answer/route.ts

## Phase 3: Infrastructure

### Step 6: Zod Validation for Remaining Routes
1. Add Zod schema to api/agent/conversation
2. Add Zod schema to api/agent/reset-chat
3. Add Zod schema to api/cody/tasks (POST)
4. Add Zod schema to api/cody/tasks/approve-review

### Step 7: CI Coverage Enforcement
1. Edit .github/workflows/ci.yml:
   - Add --coverage --reporter=json --reporter=html to test:unit
   - Add coverage upload step
2. Edit vitest.config.unit.mts:
   - Add coverage section with provider: 'v8'
   - Set reporter: ['text', 'json', 'html']

### Step 8: Web Vitals Tracking
1. Read src/infra/instrumentation-client.ts
2. Add Sentry.browserTracingIntegration() to integrations array

## Verification Commands

After each phase, run:
```bash
pnpm -s tsc --noEmit
pnpm vitest run --config vitest.config.unit.mts
pnpm lint
```

## Files Modified Summary

### Phase 1
- next.config.js
- src/app/(frontend)/error.tsx (CREATE)
- src/infra/config/env-validation.ts (CREATE)
- instrumentation.ts

### Phase 2
- Cody error utility (TBD path)
- 6 non-Cody route files
- 4 high-traffic routes

### Phase 3
- 4 remaining POST routes
- .github/workflows/ci.yml
- vitest.config.unit.mts
- src/infra/instrumentation-client.ts
