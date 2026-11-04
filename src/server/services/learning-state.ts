/**
 * Learning State Service
 *
 * @fileType service
 * @domain progress
 * @pattern service
 * @ai-summary Server copy of a student's in-lesson working state — per-exercise answer bundles and per-lesson chat progress — keyed by (user, kind, key). The browser keeps localStorage as a cache seeded from here on lesson load, so progress follows the student across shared school computers instead of living on one machine.
 *
 * Schema is owned by Admin (`user-learning-states`, unique on user+kind+key);
 * Web writes it directly, like `user-progresses`.
 */

import { ObjectId, type AnyBulkWriteOperation, type Document } from 'mongodb'

import { getContentDb } from '@/infra/db/content-db'
import {
  learningStateId,
  type LearningStateRef,
  type LearningStateValue,
} from '@/infra/learning-state/refs'
import { defaultTenantId, idCandidates } from '@/server/web-api/progress'

export const LEARNING_STATE_COLLECTION = 'user-learning-states'

/** `state: null` deletes the stored copy (lesson Reset). */
export type LearningStateWrite = LearningStateRef & { state: LearningStateValue | null }

const toUserRef = (userId: string) => (ObjectId.isValid(userId) ? new ObjectId(userId) : userId)

/** Stored states for `refs`, keyed by `learningStateId`. Missing refs are absent. */
export async function findLearningStates(
  userId: string,
  refs: LearningStateRef[],
): Promise<Record<string, LearningStateValue>> {
  if (refs.length === 0) return {}
  const wanted = new Set(refs.map(learningStateId))
  const db = await getContentDb()
  const docs = await db
    .collection(LEARNING_STATE_COLLECTION)
    .find(
      { user: { $in: idCandidates(userId) }, key: { $in: [...new Set(refs.map((r) => r.key))] } },
      { projection: { kind: 1, key: 1, state: 1 } },
    )
    .toArray()

  return Object.fromEntries(
    docs
      .map((doc) => [learningStateId({ kind: doc.kind, key: doc.key }), doc.state] as const)
      .filter(([id, state]) => wanted.has(id) && state && typeof state === 'object'),
  )
}

export async function saveLearningStates(
  userId: string,
  writes: LearningStateWrite[],
): Promise<void> {
  if (writes.length === 0) return
  const db = await getContentDb()
  const now = new Date()
  const tenant = await defaultTenantId()
  const user = toUserRef(userId)

  const operations: AnyBulkWriteOperation<Document>[] = writes.map(({ kind, key, state }) => {
    const filter = { user, kind, key }
    if (state === null) return { deleteOne: { filter } }
    return {
      updateOne: {
        filter,
        update: {
          $set: { state, updatedAt: now },
          $setOnInsert: { createdAt: now, ...(tenant ? { tenant } : {}) },
        },
        upsert: true,
      },
    }
  })

  await db.collection(LEARNING_STATE_COLLECTION).bulkWrite(operations, { ordered: false })
}

/** Lesson-chat completion percent per lesson, for the course page rings. */
export async function findLessonChatPercents(
  userId: string,
  lessonIds: string[],
): Promise<Record<string, number>> {
  const states = await findLearningStates(
    userId,
    lessonIds.map((key) => ({ kind: 'lesson-chat', key })),
  )
  return Object.fromEntries(
    lessonIds.flatMap((lessonId) => {
      const percent = (
        states[learningStateId({ kind: 'lesson-chat', key: lessonId })]?.percent as
          { percent?: unknown } | undefined
      )?.percent
      return typeof percent === 'number' ? [[lessonId, percent]] : []
    }),
  )
}
