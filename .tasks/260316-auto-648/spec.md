# QA Implementation Plan - Specification

## Overview

This plan addresses Critical and High Priority items from a QA audit covering security, error handling, validation, testing, and monitoring infrastructure.

## Requirements

### Phase 1: Critical Items

#### 1. Security Headers (next.config.js)
- Add `async headers()` function with split CSP strategy
- All routes (`/*`): Strict CSP (self, Vercel Blob, YouTube, Sentry tunnel, unsafe-inline for styles)
- Admin routes (`/admin/*`): Permissive CSP (unsafe-eval, unsafe-inline for Payload admin)
- Headers for all routes:
  - Content-Security-Policy
  - X-Frame-Options: DENY
  - Strict-Transport-Security: max-age=31536000; includeSubDomains
  - X-Content-Type-Options: nosniff
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: camera=(), microphone=(), geolocation=()
  - X-DNS-Prefetch-Control: on

#### 2. Frontend Error Boundary (src/app/(frontend)/error.tsx)
- Create new file mirroring global-error.tsx pattern
- Use 'use client' directive
- useEffect → Sentry.captureException(error)
- Locale-aware text (Hebrew/English via navigator.language)
- "Try again" button calling reset()
- Tailwind styling consistent with design system

#### 3. Env Variable Validation (src/infra/config/env-validation.ts)
- Create Zod schema for all required env vars
- Required env vars: DATABASE_URL, PAYLOAD_SECRET, BLOB_READ_WRITE_TOKEN
- Optional but logged: SENTRY_DSN, OPENAI_API_KEY, GEMINI_API_KEY, GITHUB_TOKEN
- Public: NEXT_PUBLIC_SERVER_URL, NEXT_PUBLIC_SENTRY_DSN
- Strategy: z.string().min(1) for required vars, log warning for optional

#### 4. Pre-launch E2E Cherry-pick
- Cherry-pick commit 9631fe7b from feat/pre-launch-e2e-verification branch
- Contains: test helpers, content builders, fixtures, 8 spec files

### Phase 2: Sentry Coverage

#### 5a. Enhance handleCodyApiError utility
- Find and add Sentry.captureException call
- Fixes all Cody dashboard routes (20+ routes)

#### 5b. Add captureAndRespond to non-Cody routes
Routes to update:
- api/conversations/by-context
- api/blob/upload-token
- api/jobs/run-immediate
- api/pdfjs-viewer
- api/copilotkit
- api/agent/message/persist

#### 5c. Migrate high-traffic routes to withApiHandler
Routes to migrate:
- api/agent/chat
- api/agent/chat/stream
- api/exercises/import
- api/exercises/validate-answer

### Phase 3: Infrastructure

#### 6. Zod Validation for Remaining Routes
Add Zod schemas to:
- api/agent/conversation (contextKey, exerciseId)
- api/agent/reset-chat (contextKey)
- api/cody/tasks POST
- api/cody/tasks/approve-review

#### 7. CI Coverage Enforcement
- Add --coverage --reporter=json --reporter=html to test:unit
- Upload coverage report as artifact
- Add coverage section to vitest.config.unit.mts with provider: 'v8'

#### 8. Web Vitals Tracking
- Add Sentry.browserTracingIntegration() to instrumentation-client.ts
- Captures LCP, FID/INP, CLS, TTFB, FCP

## Acceptance Criteria

1. Security headers applied and verified via response headers check
2. Frontend error.tsx catches errors and reports to Sentry
3. Env validation runs at startup, fails fast on missing required vars
4. E2E tests available in verification directory
5. All Cody API routes report errors to Sentry
6. 6 non-Cody routes use captureAndRespond
7. 4 high-traffic routes use withApiHandler with Zod
8. Remaining POST routes have Zod validation
9. CI runs with coverage reporting
10. Web vitals captured in Sentry traces
