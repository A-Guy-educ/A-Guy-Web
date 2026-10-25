/**
 * Records per-question events (wrong / correct / hint / explanation) into the
 * `question-attempts` collection for the classroom-teacher dashboard.
 *
 * Admin owns the collection schema but does not create the unique
 * (user, exercise, block) index — Web is the only writer, so Web creates it.
 *
 * @fileType service
 * @domain teacher-dashboard
 * @pattern atomic-upsert
 * @ai-summary Upserts one question-attempts doc per (user, exercise, block); dup-key = already solved
 */

import { getContentDb } from '@/infra/db/content-db'
import { logger } from '@/infra/utils/logger/logger'
import { defaultTenantId } from '@/server/web-api/progress'

import { buildQuestionAttemptWrite, type QuestionAttemptInput } from './question-attempt-write'

export const QUESTION_ATTEMPTS_COLLECTION = 'question-attempts'

const DUPLICATE_KEY = 11000
const INDEX_OPTIONS_CONFLICT = 85

// Same rationale as lesson-stats: `ObjectId.isValid` accepts any 12-byte
// string, so only the 24-hex form real content ids take is allowed through.
const HEX24 = /^[a-f0-9]{24}$/i

let indexPromise: Promise<void> | null = null

/** An equivalent index under another name already enforces the same thing. */
async function tolerateConflict(build: Promise<string>): Promise<void> {
  try {
    await build
  } catch (err) {
    if ((err as { code?: number })?.code !== INDEX_OPTIONS_CONFLICT) throw err
  }
}

async function ensureIndexes(): Promise<void> {
  // ??= keeps a single in-flight build so no first-time upsert can race past
  // the unique constraint and create a duplicate (user, exercise, block) row.
  indexPromise ??= (async () => {
    const collection = (await getContentDb()).collection(QUESTION_ATTEMPTS_COLLECTION)
    try {
      await tolerateConflict(
        collection.createIndex(
          { user: 1, exercise: 1, block: 1 },
          { unique: true, name: 'question_attempts_user_exercise_block_unique' },
        ),
      )
      // Teacher progress reads filter by student set + lesson set.
      await tolerateConflict(
        collection.createIndex({ user: 1, lesson: 1 }, { name: 'question_attempts_user_lesson' }),
      )
    } catch (err) {
      indexPromise = null
      logger.warn({ err }, 'Failed to ensure question-attempts indexes')
    }
  })()
  return indexPromise
}

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: number })?.code === DUPLICATE_KEY
}

export type RecordQuestionAttemptInput = Omit<QuestionAttemptInput, 'tenantId'>

export function isValidAttemptInput(input: RecordQuestionAttemptInput): boolean {
  return (
    HEX24.test(input.lessonId) &&
    HEX24.test(input.exerciseId) &&
    input.blockId.length > 0 &&
    input.blockId.length <= 128
  )
}

/**
 * Apply one attempt event. Returns `false` when the event was a no-op
 * (invalid ids, or a wrong/correct answer on an already-solved question).
 *
 * A duplicate-key error means the filter didn't match an existing doc. Either
 * the question is solved (filter excludes it) or a concurrent first write won
 * the insert race — retrying once distinguishes the two.
 */
export async function recordQuestionAttempt(
  input: RecordQuestionAttemptInput,
  now: Date = new Date(),
): Promise<boolean> {
  if (!isValidAttemptInput(input)) return false
  await ensureIndexes()

  const collection = (await getContentDb()).collection(QUESTION_ATTEMPTS_COLLECTION)
  // Same tenant resolution as user-progresses / user-stats writes.
  const tenantId = (await defaultTenantId())?.toString() ?? null
  const { filter, update } = buildQuestionAttemptWrite({ ...input, tenantId }, now)

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await collection.updateOne(filter, update, { upsert: true })
      return true
    } catch (error) {
      if (!isDuplicateKey(error)) throw error
    }
  }
  return false
}
