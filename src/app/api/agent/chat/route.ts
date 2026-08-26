import { randomUUID } from 'crypto'

import { after, type NextRequest, NextResponse } from 'next/server'

import { logger } from '@/infra/utils/logger'
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
import { loadTutorResources, resolveContextKey } from '@/server/web-api/chat'

const CHAT_RATE_LIMIT_MAX = 30
const CHAT_RATE_LIMIT_WINDOW_MS = 60_000

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
    const result = await createTutorChatOrchestrator().run({
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
          rateKey: `chat:${ownerId}:agent-chat`,
          rateLimit: CHAT_RATE_LIMIT_MAX,
          rateWindowMs: CHAT_RATE_LIMIT_WINDOW_MS,
        }),
    })

    if (!result.cached && result.inputTokens + result.outputTokens > 0) {
      const record = () =>
        recordLlmUsage({
          userId: ownerId,
          lessonId: body.lessonId ?? null,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          model: result.model,
          callType: 'chat',
        })
      try {
        after(record)
      } catch {
        void record()
      }
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      conversationId: result.conversationId,
      contextKey: result.contextKey,
      turnId,
    })
  } catch (error) {
    logger.error({ err: error, traceId }, 'Tutor chat failed')
    return caughtTutorChatError(error, traceId)
  }
}
