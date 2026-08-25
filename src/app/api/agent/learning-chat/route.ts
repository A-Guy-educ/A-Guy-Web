import { randomUUID } from 'crypto'

import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { chatError, TutorChatError } from '@/infra/types/tutor-chat'
import { logger } from '@/infra/utils/logger'
import { requireUser } from '@/server/auth/api-auth'
import { recordLlmUsage } from '@/server/services/llm-usage'
import {
  caughtTutorChatError,
  normalizeChatGuardFailure,
  tutorChatErrorResponse,
} from '@/server/services/tutor-chat/http'
import { createTutorChatOrchestrator } from '@/server/services/tutor-chat/runtime'
import { enforceTutorTurnPolicy } from '@/server/services/tutor-chat/turn-policy'

const BodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  acknowledgment: z.string().max(4000).optional(),
  turnId: z.string().uuid().optional(),
  conversationId: z.string().optional().nullable(),
  gradeLevel: z.string().trim().min(1).max(50),
  locale: z.string().max(10).optional(),
})

const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 60_000

function dataEvent(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(request: NextRequest) {
  const traceId = randomUUID()
  try {
    const parsed = BodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return tutorChatErrorResponse('invalid_request', { traceId })

    const auth = await requireUser(request)
    if (!auth.ok) return normalizeChatGuardFailure(auth.response)

    const ownerId = auth.value.id
    const body = parsed.data
    const contextKey = `learning:${body.gradeLevel}`
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
            systemInstructions: `You are A-Guy, a concise and encouraging tutor for a student at grade level ${body.gradeLevel}. Respond in ${body.locale || 'the same language as the student'}. Explain ideas clearly and guide the student step by step.`,
            attachmentText: '',
            parts: [],
            signal: request.signal,
            beforeGenerate: () =>
              enforceTutorTurnPolicy({
                ownerId,
                rateKey: `chat:${ownerId}:agent-learning-chat`,
                rateLimit: RATE_LIMIT_MAX,
                rateWindowMs: RATE_LIMIT_WINDOW_MS,
              }),
          })
          let result
          while (true) {
            const next = await providerStream.next()
            if (next.done) {
              result = next.value
              break
            }
            controller.enqueue(encoder.encode(dataEvent({ type: 'chunk', text: next.value })))
          }

          if (!result.cached && result.inputTokens + result.outputTokens > 0) {
            await recordLlmUsage({
              userId: ownerId,
              lessonId: null,
              inputTokens: result.inputTokens,
              outputTokens: result.outputTokens,
              model: result.model,
              callType: 'chat_stream',
            })
          }
          controller.enqueue(
            encoder.encode(
              dataEvent({ type: 'done', conversationId: result.conversationId, turnId }),
            ),
          )
        } catch (error) {
          logger.error({ err: error, contextKey, traceId }, 'Learning tutor stream failed')
          const normalized =
            error instanceof TutorChatError
              ? chatError(error.code, { message: error.message, ...error.details, traceId }).body
              : chatError('internal_error', { traceId }).body
          controller.enqueue(
            encoder.encode(
              dataEvent({ type: 'error', error: normalized.message, errorCode: normalized.error }),
            ),
          )
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
    logger.error({ err: error, traceId }, 'Learning tutor setup failed')
    return caughtTutorChatError(error, traceId)
  }
}
