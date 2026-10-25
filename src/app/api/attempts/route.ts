import { NextRequest } from 'next/server'
import { z } from 'zod'

import { rateLimit, rateLimitExceededResponse } from '@/infra/security/rate-limit'
import { createRequestLogger } from '@/infra/utils/logger/logger'
import { getWebUser } from '@/infra/web-api/mongo-payload'
import { recordQuestionAttempt } from '@/server/services/question-attempts/question-attempt-recorder'
import { QUESTION_ATTEMPT_EVENTS } from '@/server/services/question-attempts/question-attempt-write'

/**
 * Per-question events the server can't observe on its own: answers graded
 * client-side (select / matching / table) plus hint and explanation clicks.
 * Free-response answers are recorded by /api/exercises/validate-answer.
 */

const ATTEMPTS_RATE_LIMIT_MAX = 120
const ATTEMPTS_RATE_LIMIT_WINDOW_MS = 60_000

const BodySchema = z.object({
  lessonId: z.string().min(1),
  exerciseId: z.string().min(1),
  blockId: z.string().min(1).max(128),
  event: z.enum(QUESTION_ATTEMPT_EVENTS),
})

export async function POST(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const rate = await rateLimit({
    key: `user:${user.id}:question-attempts`,
    limit: ATTEMPTS_RATE_LIMIT_MAX,
    windowMs: ATTEMPTS_RATE_LIMIT_WINDOW_MS,
  })
  if (!rate.allowed) return rateLimitExceededResponse(rate)

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ success: false, error: 'Validation failed' }, { status: 400 })
  }

  try {
    const recorded = await recordQuestionAttempt({
      ...parsed.data,
      userId: String(user.id),
    })
    return Response.json({ success: true, data: { recorded } })
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
    createRequestLogger(requestId).error(
      { err: error instanceof Error ? { message: error.message } : error, userId: user.id },
      'question-attempts: failed to record event',
    )
    return Response.json({ success: false, error: 'Failed to record attempt' }, { status: 500 })
  }
}
