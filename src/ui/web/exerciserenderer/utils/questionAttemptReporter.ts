/**
 * Question Attempt Reporter
 * Fire-and-forget POST to /api/attempts for per-question events the server
 * can't see: client-graded answers (select / matching / table) and hint /
 * explanation clicks. Free-response verdicts are recorded by validate-answer.
 */

import type { QuestionBlock, UserAnswer } from '../types'

export type QuestionAttemptEvent = 'wrong' | 'correct' | 'hint' | 'explanation'

export interface QuestionAttemptContext {
  lessonId?: string
  exerciseId?: string
}

export function reportQuestionAttempt(
  context: QuestionAttemptContext,
  blockId: string,
  event: QuestionAttemptEvent,
): void {
  if (!context.lessonId || !context.exerciseId || !blockId) return
  fetch('/api/attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // keepalive so a click right before navigating away still lands.
    keepalive: true,
    body: JSON.stringify({
      lessonId: context.lessonId,
      exerciseId: context.exerciseId,
      blockId,
      event,
    }),
  }).catch(() => {
    // Analytics only — guests get 401 and offline clicks are dropped.
  })
}

/**
 * Whether a client-side check produced a real verdict worth recording, as
 * opposed to an "answer first" prompt for an empty submission. Free-response
 * is excluded because validate-answer already records it server-side.
 */
export function isClientGradedSubmission(question: QuestionBlock, answer: UserAnswer): boolean {
  if (question.type === 'question_free_response') return false
  switch (answer.type) {
    case 'true_false':
      return answer.value !== null && answer.value !== undefined
    case 'mcq':
      return answer.selectedIds.length > 0
    case 'matching':
      return answer.connections.length > 0
    case 'table':
      return true
    default:
      return false
  }
}
