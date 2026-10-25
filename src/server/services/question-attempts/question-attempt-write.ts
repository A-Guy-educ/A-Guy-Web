/**
 * Builds the single atomic upsert that records one question-attempt event.
 *
 * One `question-attempts` doc per (user, exercise, block). Payload defaults
 * don't run for raw Mongo writes, so every field Admin's schema expects is
 * seeded in `$setOnInsert` — except counters `$inc`'d in the same op (Mongo
 * rejects the same path in both operators).
 *
 * `wrong` and `correct` only apply while the question is unsolved: "mistakes"
 * are wrong submissions *before* the correct one, and `solvedAt` is the first
 * correct answer. The `solved: { $ne: true }` filter makes a solved doc
 * unmatchable, so the upsert attempts an insert and hits the unique index —
 * the recorder treats that duplicate-key error as "already solved, no-op".
 *
 * @fileType service
 * @domain teacher-dashboard
 * @pattern atomic-upsert
 * @ai-summary Pure builder for the question-attempts upsert filter/update ($inc/$set/$setOnInsert)
 */

import type { Document } from 'mongodb'

import { objectIdFromString } from '@/infra/db/content-db'

export const QUESTION_ATTEMPT_EVENTS = ['wrong', 'correct', 'hint', 'explanation'] as const
export type QuestionAttemptEvent = (typeof QUESTION_ATTEMPT_EVENTS)[number]

export interface QuestionAttemptInput {
  userId: string
  tenantId: string | null
  lessonId: string
  exerciseId: string
  blockId: string
  event: QuestionAttemptEvent
}

const COUNTERS = ['wrongCount', 'hintCount', 'explanationCount'] as const

const COUNTER_BY_EVENT: Record<QuestionAttemptEvent, (typeof COUNTERS)[number] | null> = {
  wrong: 'wrongCount',
  correct: null,
  hint: 'hintCount',
  explanation: 'explanationCount',
}

/** Events that stop counting once the question is solved. */
const UNSOLVED_ONLY: ReadonlySet<QuestionAttemptEvent> = new Set(['wrong', 'correct'])

export function buildQuestionAttemptWrite(
  input: QuestionAttemptInput,
  now: Date,
): { filter: Document; update: Document } {
  const key = {
    user: objectIdFromString(input.userId),
    exercise: objectIdFromString(input.exerciseId),
    block: input.blockId,
  }
  const incField = COUNTER_BY_EVENT[input.event]
  const solvesNow = input.event === 'correct'

  const setOnInsert: Document = {
    lesson: objectIdFromString(input.lessonId),
    firstAttemptAt: now,
    createdAt: now,
    ...(input.tenantId ? { tenant: objectIdFromString(input.tenantId) } : {}),
    ...(solvesNow ? {} : { solved: false }),
    ...Object.fromEntries(COUNTERS.filter((c) => c !== incField).map((c) => [c, 0])),
  }

  const update: Document = {
    $set: { updatedAt: now, ...(solvesNow ? { solved: true, solvedAt: now } : {}) },
    $setOnInsert: setOnInsert,
    ...(incField ? { $inc: { [incField]: 1 } } : {}),
  }

  const filter = UNSOLVED_ONLY.has(input.event) ? { ...key, solved: { $ne: true } } : key
  return { filter, update }
}
