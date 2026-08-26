import { NextResponse } from 'next/server'
import { z } from 'zod'

import { applyRateLimitHeaders, type RateLimitResult } from '@/infra/security/rate-limit'
import { chatError, TutorChatError } from '@/infra/types/tutor-chat'
import { CHAT_ASSET_MAX_ATTACHMENTS } from '@/server/chat-assets/constants'

const MAX_MESSAGE_LENGTH = 4000
const MAX_CONTEXT_KEY_LENGTH = 200

export const TutorChatBodySchema = z.object({
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  acknowledgment: z.string().max(MAX_MESSAGE_LENGTH).optional(),
  turnId: z.string().uuid().optional(),
  exerciseId: z.string().optional(),
  lessonId: z.string().optional(),
  chapterId: z.string().optional(),
  courseId: z.string().optional(),
  categoryId: z.string().optional(),
  mediaIds: z.array(z.string()).max(CHAT_ASSET_MAX_ATTACHMENTS).optional(),
  chatAssetIds: z.array(z.string()).max(CHAT_ASSET_MAX_ATTACHMENTS).optional(),
  contextKeyOverride: z.string().max(MAX_CONTEXT_KEY_LENGTH).optional(),
  hidden: z.boolean().optional(),
  hidePromptOnly: z.boolean().optional(),
})

export function tutorChatErrorResponse(
  code: Parameters<typeof chatError>[0],
  details?: Parameters<typeof chatError>[1],
) {
  const error = chatError(code, details)
  return NextResponse.json(error.body, { status: error.status })
}

export async function normalizeChatGuardFailure(response: NextResponse) {
  if (response.status === 401) return tutorChatErrorResponse('auth_required')
  if (response.status !== 429) return response

  const legacy = (await response
    .clone()
    .json()
    .catch(() => ({}))) as Record<string, unknown>
  return tutorChatErrorResponse('quota_exceeded', {
    questionsUsed: typeof legacy.questionsUsed === 'number' ? legacy.questionsUsed : undefined,
    maxQuestions: typeof legacy.maxQuestions === 'number' ? legacy.maxQuestions : undefined,
    resetAt: typeof legacy.resetAt === 'string' ? legacy.resetAt : null,
  })
}

export function tutorRateLimitResponse(rate: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))
  const response = tutorChatErrorResponse('rate_limited', { retryAfter })
  applyRateLimitHeaders(response.headers, rate)
  return response
}

export function caughtTutorChatError(error: unknown, traceId: string) {
  if (error instanceof TutorChatError) {
    return tutorChatErrorResponse(error.code, {
      message: error.message,
      ...error.details,
      traceId,
    })
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return tutorChatErrorResponse('provider_error', {
      message: 'The tutor request was interrupted.',
      traceId,
    })
  }
  return tutorChatErrorResponse('internal_error', { traceId })
}
