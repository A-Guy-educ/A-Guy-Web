# Codebase Context: 260316-auto-648

## Files to Modify
- `next.config.js` (lines 10-82) — Add `headers()` function with split CSP strategy
- `src/app/(frontend)/error.tsx` (NEW) — Create frontend error boundary
- `src/infra/config/env-validation.ts` (NEW) — Create Zod env validation
- `instrumentation.ts` (lines 3-11) — Hook validateEnv() in nodejs runtime block
- `src/infra/instrumentation-client.ts` (line 21) — Add browserTracingIntegration
- `src/ui/cody/github-error-handler.ts` (lines 1, 70-76) — Add Sentry import + captureException
- `src/app/api/conversations/by-context/route.ts` (lines 58, 120, 150) — Replace catch blocks with captureAndRespond
- `src/app/api/blob/upload-token/route.ts` (line 143) — Add Sentry to bare catch
- `src/app/api/jobs/run-immediate/route.ts` (line 159) — Add Sentry to catch
- `src/app/api/pdfjs-viewer/route.ts` (line 111) — Add Sentry to catch
- `src/app/api/copilotkit/route.ts` (line 161) — Add Sentry to catch
- `src/app/api/agent/message/persist/route.ts` (line 116) — Add Sentry to non-Zod catch
- `src/app/api/agent/chat/route.ts` (line 78) — Add Sentry capture in catch
- `src/app/api/agent/chat/stream/route.ts` (line 88) — Add Sentry capture in catch
- `src/app/api/exercises/import/route.ts` (line 48) — Add Sentry capture in catch
- `src/app/api/exercises/validate-answer/route.ts` (line 29) — Add Sentry capture in catch
- `src/app/api/agent/conversation/route.ts` (full file) — Add Zod schema + Sentry
- `src/app/api/agent/reset-chat/route.ts` (full file) — Add Zod schema + Sentry
- `src/app/api/cody/tasks/route.ts` (lines 357-430) — Add Zod schema to POST
- `src/app/api/cody/tasks/approve-review/route.ts` (lines 21-27) — Add Zod schema
- `.github/workflows/ci.yml` (line 66) — Add --coverage flag + upload step

## Files to Read (reference patterns)
- `src/app/global-error.tsx` — Error boundary pattern (locale detection, Sentry, Tailwind)
- `src/app/(cody)/cody/error.tsx` — Alternative error boundary pattern (Button component, no html wrapper)
- `src/server/api/capture-and-respond.ts` — captureAndRespond utility pattern
- `src/server/api/with-api-handler.ts` — withApiHandler pattern (auth, body/query parsing, Sentry)
- `src/server/payload/endpoints/agent/chat/request-validation.ts` — Existing chatRequestSchema Zod pattern
- `src/infra/config/server-init.ts` — Server initialization pattern reference
- `tests/unit/api/with-api-handler.spec.ts` — Test pattern for API handler tests

## Key Signatures
- `captureAndRespond(error: unknown, context: { route: string; requestId?: string }): NextResponse` from `src/server/api/capture-and-respond.ts`
- `withApiHandler<TBody, TQuery>(options: HandlerOptions<TBody, TQuery>, handler: (ctx: ApiContext<TBody, TQuery>) => Promise<NextResponse>)` from `src/server/api/with-api-handler.ts`
- `handleCodyApiError(error: unknown, routeName: string): NextResponse<ApiErrorResponse>` from `src/ui/cody/github-error-handler.ts`
- `requireCodyAuth(req: NextRequest)` from `@/ui/cody/auth`
- `verifyActorLogin(req: NextRequest, actorLogin: string)` from `@/ui/cody/auth`
- `agentChat(req: PayloadRequest-like)` from `@/server/payload/endpoints/agent/chat`
- `agentChatStream(req: PayloadRequest-like)` from `@/server/payload/endpoints/agent/chat-stream`
- `validateAnswer(req: PayloadRequest-like)` from `@/server/payload/endpoints/exercises/validate-answer`
- `getConversation(req: PayloadRequest-like)` from `@/server/payload/endpoints/agent/get-conversation`
- `agentResetChat(req: PayloadRequest-like)` from `@/server/payload/endpoints/agent/reset-chat`

## Reuse Inventory
- `captureAndRespond` from `src/server/api/capture-and-respond.ts` — use for conversations/by-context catch blocks
- `Sentry.captureException` from `@sentry/nextjs` — use directly in routes where captureAndRespond doesn't fit
- `Sentry.browserTracingIntegration` from `@sentry/nextjs` — use in instrumentation-client.ts
- `Sentry.replayIntegration` from `@sentry/nextjs` — already in instrumentation-client.ts, keep
- `chatRequestSchema` from `src/server/payload/endpoints/agent/chat/request-validation.ts` — already exists, no need to create duplicate Zod schema for chat routes
- `z` from `zod` — already imported in multiple files

## Integration Points
- `instrumentation.ts` register() is called at Node.js startup by Next.js — env validation runs here
- `handleCodyApiError` is used by 14+ Cody API route files — single change fixes all
- `captureAndRespond` already used by 4 routes (study-plan, exercises/convert/runner, chat-assets/finalize, chapters/by-grade) — proven pattern
- `vitest.config.unit.mts` already has coverage config with v8 provider and thresholds
- Cherry-pick commit `9631fe7b` is accessible and adds files to `tests/e2e/helpers/` and `tests/e2e/verification/`

## Imports Verified
- `@sentry/nextjs` → exports `captureException`, `browserTracingIntegration`, `replayIntegration` ✅
- `@/server/api/capture-and-respond` → exports `captureAndRespond` ✅
- `@/server/api/with-api-handler` → exports `withApiHandler`, `ApiContext`, `HandlerOptions` ✅
- `@/ui/cody/github-error-handler` → exports `handleCodyApiError` ✅
- `@/ui/cody/auth` → exports `requireCodyAuth`, `verifyActorLogin` ✅
- `@/infra/utils/logger/logger` → exports `logger` ✅
- `@/infra/utils/logger` → exports `logger` ✅
- `zod` → exports `z`, `ZodError` ✅
