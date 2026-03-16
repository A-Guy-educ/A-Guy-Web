# QA Implementation Plan — Spec

## Overview
Implement Critical and High Priority items from the QA audit. The audit identified 15 areas of concern covering security, error handling, validation, testing, and monitoring.

## Requirements

### Phase 1: Critical Items

1. **Security Headers** (`next.config.js`)
   - Add `async headers()` function with split CSP strategy
   - All routes (`/*`): Strict CSP (self, Vercel Blob, YouTube, Sentry tunnel, unsafe-inline for styles)
   - Admin routes (`/admin/*`): Permissive CSP (unsafe-eval, unsafe-inline for Payload admin)
   - Headers: Content-Security-Policy, X-Frame-Options, Strict-Transport-Security, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control

2. **Frontend Error Boundary** (`src/app/(frontend)/error.tsx`)
   - Create new file
   - Mirror `global-error.tsx` pattern
   - Add 'use client' directive
   - UseEffect for Sentry.captureException
   - Locale-aware text (Hebrew/English)
   - "Try again" button with reset()
   - Tailwind styling consistent with design system

3. **Env Variable Validation** (`src/infra/config/env-validation.ts`)
   - Create Zod schema for required env vars
   - Required: DATABASE_URL, PAYLOAD_SECRET, BLOB_READ_WRITE_TOKEN
   - Optional with warning: SENTRY_DSN, OPENAI_API_KEY, GEMINI_API_KEY, GITHUB_TOKEN
   - Public: NEXT_PUBLIC_SERVER_URL, NEXT_PUBLIC_SENTRY_DSN
   - Hook into `instrumentation.ts` at startup

4. **Pre-launch E2E Tests**
   - Cherry-pick commit 9631fe7b from feat/pre-launch-e2e-verification
   - Contains: helpers, fixtures, 8 spec files

### Phase 2: Sentry Coverage

5a. **Enhance handleCodyApiError utility**
   - Add Sentry.captureException call
   - Fixes all 20 Cody dashboard routes

5b. **Add captureAndRespond to 6 non-Cody routes**
   - api/conversations/by-context
   - api/blob/upload-token
   - api/jobs/run-immediate
   - api/pdfjs-viewer
   - api/copilotkit
   - api/agent/message/persist

5c. **Migrate 4 high-traffic routes to withApiHandler**
   - api/agent/chat
   - api/agent/chat/stream
   - api/exercises/import
   - api/exercises/validate-answer

### Phase 3: Infrastructure

6. **Zod Validation for Remaining Routes**
   - api/agent/conversation
   - api/agent/reset-chat
   - api/cody/tasks POST
   - api/cody/tasks/approve-review

7. **CI Coverage Enforcement**
   - Add --coverage flag to test:unit in ci.yml (e.g., `pnpm test:unit -- --coverage`)
   - Upload coverage report as artifact
   - NOTE: vitest.config.unit.mts already has coverage config (provider: 'v8', thresholds, reporters) - no changes needed there

8. **Web Vitals Tracking**
   - Add Sentry.browserTracingIntegration() in instrumentation-client.ts

## Acceptance Criteria

- [ ] Phase 1 Critical items implemented:
  - [ ] Security headers added to next.config.js with split CSP
  - [ ] Frontend error.tsx created with Sentry + locale support
  - [ ] Env validation created and hooked into instrumentation
  - [ ] E2E tests cherry-picked successfully
- [ ] Phase 2 Sentry Coverage:
  - [ ] Cody error utility (src/ui/cody/github-error-handler.ts) enhanced with Sentry
  - [ ] 6 non-Cody routes use captureAndRespond
  - [ ] 4 high-traffic routes migrated to withApiHandler
- [ ] Phase 3 Infrastructure:
  - [ ] Zod schemas added to remaining routes
  - [ ] CI workflow includes --coverage flag in test:unit step
  - [ ] vitest.config.unit.mts already has coverage config (no changes needed)
  - [ ] Web Vitals tracking enabled in instrumentation-client.ts
- [ ] Verification passes:
  - [ ] `pnpm -s tsc --noEmit` passes
  - [ ] `pnpm vitest run --config vitest.config.unit.mts` passes
  - [ ] `pnpm lint` passes
