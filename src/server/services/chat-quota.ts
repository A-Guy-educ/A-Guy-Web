/**
 * Chat Quota Service
 *
 * @fileType service
 * @domain chat
 * @pattern rolling-window-quota
 * @ai-summary Checks and increments authenticated user chat quota (rolling window)
 */
import { getStudentChatConfig } from '@/server/config/student-chat-config'
import type { Payload } from 'payload'

export interface ChatQuotaResult {
  allowed: boolean
  questionsUsed: number
  maxQuestions: number
  resetAt: string | null
}

/**
 * Check if user has quota remaining and increment if so.
 * Uses a rolling window: if windowStart + windowHours has passed, reset the counter.
 */
export async function checkAndIncrementChatQuota(
  payload: Payload,
  userId: string,
): Promise<ChatQuotaResult> {
  const config = await getStudentChatConfig()
  const now = new Date()

  const user = await payload.findByID({ collection: 'users', id: userId })
  const windowStart = user.chatWindowStart ? new Date(user.chatWindowStart) : null
  let questionsUsed = user.chatQuestionsUsed ?? 0

  // If no window or window expired, start fresh
  const windowMs = config.window_hours * 60 * 60 * 1000
  const windowExpired = !windowStart || now.getTime() - windowStart.getTime() > windowMs

  if (windowExpired) {
    questionsUsed = 0
  }

  // Check limit
  if (questionsUsed >= config.max_questions) {
    const resetAt = windowStart ? new Date(windowStart.getTime() + windowMs).toISOString() : null
    return { allowed: false, questionsUsed, maxQuestions: config.max_questions, resetAt }
  }

  // Increment
  const newWindowStart = windowExpired ? now.toISOString() : user.chatWindowStart
  const newCount = questionsUsed + 1

  await payload.update({
    collection: 'users',
    id: userId,
    data: {
      chatQuestionsUsed: newCount,
      chatWindowStart: newWindowStart,
    },
    overrideAccess: true,
  })

  const resetAt = newWindowStart
    ? new Date(new Date(newWindowStart).getTime() + windowMs).toISOString()
    : null

  return { allowed: true, questionsUsed: newCount, maxQuestions: config.max_questions, resetAt }
}

/**
 * Get current quota status without incrementing.
 */
export async function getChatQuotaStatus(
  payload: Payload,
  userId: string,
): Promise<ChatQuotaResult> {
  const config = await getStudentChatConfig()
  const now = new Date()

  const user = await payload.findByID({ collection: 'users', id: userId })
  const windowStart = user.chatWindowStart ? new Date(user.chatWindowStart) : null
  let questionsUsed = user.chatQuestionsUsed ?? 0

  const windowMs = config.window_hours * 60 * 60 * 1000
  const windowExpired = !windowStart || now.getTime() - windowStart.getTime() > windowMs

  if (windowExpired) {
    questionsUsed = 0
  }

  const resetAt =
    windowStart && !windowExpired ? new Date(windowStart.getTime() + windowMs).toISOString() : null

  return {
    allowed: questionsUsed < config.max_questions,
    questionsUsed,
    maxQuestions: config.max_questions,
    resetAt,
  }
}
