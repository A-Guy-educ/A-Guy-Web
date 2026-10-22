/**
 * Tier lesson-access reader — the "opened lessons" counter behind the
 * free-tier content gates (TIERS.md "Content gating rules").
 *
 * "Opened" = any `recordType: 'lesson'` entry in the user's `user-progresses`
 * doc for this gradeLevel. Records are appended on first open and updated in
 * place, so array order is first-opened order. Each record is bucketed into
 * learning / practice / exam by joining `recordId` → `lessons.type`.
 *
 * Returns empty lists when the tier kill switch is off (no Mongo reads), so
 * the gates in `@/lib/tiers/content-gates` stay permissive.
 *
 * @fileType service
 * @domain billing
 * @ai-summary Per-(user, gradeLevel) opened-lesson ids by lesson type, for tier gating.
 */

import { getContentDb, objectIdFromString } from '@/infra/db/content-db'
import {
  EMPTY_OPENED_LESSONS,
  canAccessExam,
  canAccessPracticeLesson,
  getLearningLessonOpenOrdinal,
  isTierEnforcementEnabled,
  type OpenedLessonIds,
  type UserWithTier,
} from '@/lib/tiers'
import { getEffectiveLessonType } from '@/server/constants/lesson-types'
import { findUserProgress } from '@/server/web-api/progress'

function openedLessonIdsInOrder(records: { recordType: string; recordId: string }[]): string[] {
  const seen = new Set<string>()
  for (const record of records) {
    if (record.recordType === 'lesson' && record.recordId) seen.add(record.recordId)
  }
  return [...seen]
}

async function queryLessonTypes(lessonIds: string[]): Promise<Map<string, string | null>> {
  const db = await getContentDb()
  const docs = await db
    .collection('lessons')
    .find({ _id: { $in: lessonIds.map(objectIdFromString) } } as never, {
      projection: { _id: 1, type: 1 },
    })
    .toArray()
  return new Map(docs.map((doc) => [String(doc._id), (doc.type as string | null) ?? null]))
}

export async function getOpenedLessonIds(
  userId: string | null | undefined,
  gradeLevel: string | null | undefined,
): Promise<OpenedLessonIds> {
  if (!isTierEnforcementEnabled() || !userId || !gradeLevel) return EMPTY_OPENED_LESSONS

  const progress = await findUserProgress(userId, gradeLevel)
  const lessonIds = openedLessonIdsInOrder(progress?.progressRecords ?? [])
  if (lessonIds.length === 0) return EMPTY_OPENED_LESSONS

  const typesById = await queryLessonTypes(lessonIds)
  const opened: OpenedLessonIds = { learning: [], practice: [], exam: [] }
  for (const id of lessonIds) {
    // A record whose lesson was deleted doesn't use up a slot.
    if (!typesById.has(id)) continue
    opened[getEffectiveLessonType(typesById.get(id))].push(id)
  }
  return opened
}

export type LessonTierAccess = {
  /** Practice/exam past the user's allowance — the page should send them to /subscriptions. */
  isLocked: boolean
  /** Position in the user's opened learning lessons; `null` for practice/exam. */
  learningOpenOrdinal: number | null
}

/** Server-side tier decision for one lesson page render. */
export async function resolveLessonTierAccess({
  user,
  lessonId,
  lessonType,
  gradeLevel,
}: {
  user: (UserWithTier & { id?: string | null }) | null
  lessonId: string
  lessonType: string | null | undefined
  gradeLevel: string | null | undefined
}): Promise<LessonTierAccess> {
  const opened = await getOpenedLessonIds(user?.id, gradeLevel)
  const type = getEffectiveLessonType(lessonType)
  if (type === 'learning') {
    return {
      isLocked: false,
      learningOpenOrdinal: getLearningLessonOpenOrdinal(lessonId, opened.learning),
    }
  }
  const allowed =
    type === 'practice'
      ? canAccessPracticeLesson(user, lessonId, opened.practice)
      : canAccessExam(user, lessonId, opened.exam)
  return { isLocked: !allowed, learningOpenOrdinal: null }
}
