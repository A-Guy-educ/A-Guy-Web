/**
 * Per-visit lesson dwell log (Product Health spec v0.4 — "≥60s dwell within
 * a single lesson session").
 *
 * One doc per lesson *visit* in the `lesson-visits` collection. A visit is
 * one mount of the lesson page: the browser mints a `visitId` on mount and
 * sends it with every /api/stats/heartbeat while that lesson is on screen.
 * The first ping (seconds=0) opens the visit so bounces that never reach a
 * 30s heartbeat still count as visits; later pings `$inc` the dwell.
 *
 * Unlike `user-progresses.progressRecords[].timeSpentSeconds` (cumulative
 * across every visit, last-access-only date), each row here keeps its own
 * start date and dwell, so activity days are never overwritten by a later
 * revisit of the same lesson.
 *
 * @fileType service
 * @domain dashboard
 * @pattern event-log
 * @ai-summary Upserts one row per lesson visit (dwell seconds, content type, scrolled flag)
 */

import { ObjectId } from 'mongodb'

import { getContentDb } from '@/infra/db/content-db'
import { logger } from '@/infra/utils/logger/logger'

export const LESSON_VISITS_COLLECTION = 'lesson-visits'

export const LESSON_VISIT_CONTENT_TYPES = ['pdf', 'exercises', 'blocks'] as const
export type LessonVisitContentType = (typeof LESSON_VISIT_CONTENT_TYPES)[number]

export interface LessonVisitPing {
  userId: string
  visitId: string
  lessonId: string
  courseId?: string
  contentType?: LessonVisitContentType
  seconds: number
  scrolled: boolean
}

let indexPromise: Promise<void> | null = null

async function ensureIndexes(): Promise<void> {
  // Unique visitId closes the race where two concurrent first pings for the
  // same visit would both upsert and split one visit into two rows.
  indexPromise ??= (async () => {
    const db = await getContentDb()
    const collection = db.collection(LESSON_VISITS_COLLECTION)
    try {
      await collection.createIndex(
        { visitId: 1 },
        { unique: true, name: 'lesson_visits_visit_id_unique' },
      )
      await collection.createIndex(
        { startedAt: 1, user: 1 },
        { name: 'lesson_visits_started_at_user' },
      )
      await collection.createIndex({ user: 1, startedAt: -1 }, { name: 'lesson_visits_user' })
    } catch (err) {
      indexPromise = null
      logger.warn({ err }, 'Failed to ensure lesson-visits indexes')
    }
  })()
  return indexPromise
}

function toUserRef(userId: string): ObjectId | string {
  return ObjectId.isValid(userId) && userId.length === 24 ? new ObjectId(userId) : userId
}

/**
 * Open or extend a visit. `$max` on `scrolled` makes the flag sticky — once
 * a visit scrolled, a later ping without the flag can't clear it.
 */
export async function recordLessonVisitPing(ping: LessonVisitPing): Promise<void> {
  await ensureIndexes()
  const db = await getContentDb()
  const now = new Date()
  try {
    await db.collection(LESSON_VISITS_COLLECTION).updateOne(
      { visitId: ping.visitId, user: toUserRef(ping.userId) },
      {
        $setOnInsert: {
          lessonId: ping.lessonId,
          courseId: ping.courseId ?? null,
          contentType: ping.contentType ?? null,
          startedAt: now,
        },
        $inc: { dwellSeconds: ping.seconds },
        $max: { scrolled: ping.scrolled },
        $set: { lastSeenAt: now },
      },
      { upsert: true },
    )
  } catch (err) {
    // A duplicate-key here means another user replayed someone's visitId —
    // drop the ping rather than attribute dwell to the wrong account.
    logger.warn({ err, visitId: ping.visitId }, 'lesson-visits: ping rejected')
  }
}
