import { randomUUID } from 'crypto'

import type { NextRequest } from 'next/server'

import { logger } from '@/infra/utils/logger'
import { chatError, TutorChatError } from '@/infra/types/tutor-chat'
import { requireUser } from '@/server/auth/api-auth'
import { recordLlmUsage } from '@/server/services/llm-usage'
import {
  caughtTutorChatError,
  normalizeChatGuardFailure,
  TutorChatBodySchema,
  tutorChatErrorResponse,
} from '@/server/services/tutor-chat/http'
import { createTutorChatOrchestrator } from '@/server/services/tutor-chat/runtime'
import { enforceTutorTurnPolicy } from '@/server/services/tutor-chat/turn-policy'
import { loadTutorResources, resolveContextKey, toSse } from '@/server/web-api/chat'

const CHAT_STREAM_RATE_LIMIT_MAX = 20
const CHAT_STREAM_RATE_LIMIT_WINDOW_MS = 60_000

export async function POST(request: NextRequest) {
  const traceId = randomUUID()
  try {
    const parsed = TutorChatBodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return tutorChatErrorResponse('invalid_request', { traceId })

    const auth = await requireUser(request)
    if (!auth.ok) return normalizeChatGuardFailure(auth.response)

    const ownerId = auth.value.id

    const body = parsed.data
    const contextKey = resolveContextKey(body, body.contextKeyOverride)
    if (!contextKey) return tutorChatErrorResponse('invalid_request', { traceId })

    const resources = await loadTutorResources({
      ownerId,
      lessonId: body.lessonId,
      mediaIds: body.mediaIds,
      chatAssetIds: body.chatAssetIds,
    })
    const turnId = body.turnId || randomUUID()
    const orchestrator = createTutorChatOrchestrator()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          const providerStream = orchestrator.stream({
            ownerId,
            contextKey,
            turnId,
            message: body.message,
            acknowledgment: body.acknowledgment || 'I can help with that.',
            lessonText: resources.lessonText,
            attachmentText: resources.attachmentText,
            parts: resources.parts,
            hidden: body.hidden,
            hidePromptOnly: body.hidePromptOnly,
            media: body.mediaIds?.map((mediaId) => ({ mediaId })),
            chatAssets: body.chatAssetIds?.map((chatAssetId) => ({ chatAssetId })),
            signal: request.signal,
            beforeGenerate: () =>
              enforceTutorTurnPolicy({
                ownerId,
                rateKey: `chat:${ownerId}:agent-chat-stream`,
                rateLimit: CHAT_STREAM_RATE_LIMIT_MAX,
                rateWindowMs: CHAT_STREAM_RATE_LIMIT_WINDOW_MS,
              }),
          })
          let result
          while (true) {
            const next = await providerStream.next()
            if (next.done) {
              result = next.value
              break
            }
            controller.enqueue(encoder.encode(toSse('chunk', { text: next.value })))
          }

          if (!result.cached && result.inputTokens + result.outputTokens > 0) {
            await recordLlmUsage({
              userId: ownerId,
              lessonId: body.lessonId ?? null,
              inputTokens: result.inputTokens,
              outputTokens: result.outputTokens,
              model: result.model,
              callType: 'chat_stream',
            })
          }
          controller.enqueue(
            encoder.encode(
              toSse('done', {
                conversationId: result.conversationId,
                contextKey: result.contextKey,
                turnId,
              }),
            ),
          )
        } catch (error) {
          logger.error({ err: error, contextKey, traceId }, 'Tutor chat stream failed')
          const normalized =
            error instanceof TutorChatError
              ? chatError(error.code, { message: error.message, ...error.details, traceId }).body
              : chatError('internal_error', { traceId }).body
          controller.enqueue(encoder.encode(toSse('error', normalized)))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    logger.error({ err: error, traceId }, 'Tutor chat stream setup failed')
    return caughtTutorChatError(error, traceId)
  }
}
