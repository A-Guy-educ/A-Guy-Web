import { rateLimit } from '@/infra/security/rate-limit'
import { TutorChatError } from '@/infra/types/tutor-chat'
import { checkAndIncrementChatQuota } from '@/server/services/chat-quota'
import { checkTokenLimit } from '@/server/services/llm-usage'

export async function enforceTutorTurnPolicy(input: {
  ownerId: string
  rateKey: string
  rateLimit: number
  rateWindowMs: number
}) {
  const tokenLimit = await checkTokenLimit(input.ownerId)
  if (!tokenLimit.withinLimit) {
    throw new TutorChatError('token_limit_exceeded', undefined, {
      used: tokenLimit.used,
      limit: tokenLimit.limit,
      resetAt: tokenLimit.resetAt,
    })
  }

  const rate = await rateLimit({
    key: input.rateKey,
    limit: input.rateLimit,
    windowMs: input.rateWindowMs,
  })
  if (!rate.allowed) {
    throw new TutorChatError('rate_limited', undefined, {
      retryAfter: Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000)),
    })
  }

  const quota = await checkAndIncrementChatQuota(input.ownerId)
  if (!quota.allowed) {
    throw new TutorChatError('quota_exceeded', undefined, {
      questionsUsed: quota.questionsUsed,
      maxQuestions: quota.maxQuestions,
      resetAt: quota.resetAt,
    })
  }
}
