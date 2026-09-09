/**
 * "Lesson started / completed" signal (spec §2 Lesson Completion Rate).
 *
 * Source: `user-progresses.progressRecords[]` with
 *   - `recordType === 'lesson'`
 *   - `lastAccessedAt` inside the signal span
 *
 * Returned as one row per record so the calculator can bucket by day
 * without averaging (§4). `completed` = status === 'completed'.
 *
 * §9 note (cohort logic): a lesson opened before the window and finished
 * inside it counts as both started and completed in the bucket that
 * contains `lastAccessedAt`. That matches "activity happened here"
 * without requiring a separate start-date field the model doesn't have.
 */

import { type Db } from 'mongodb'

import { courseUserFilter } from './course-filter'
import type { LessonAttempt, SignalSpan } from './signal-types'

interface Row {
  date: string
  completed: boolean
}

export async function fetchLessonAttempts(
  db: Db,
  span: SignalSpan,
  courseId: string | null,
): Promise<LessonAttempt[]> {
  const scope = await courseUserFilter(db, courseId)
  const pipeline: Record<string, unknown>[] = []
  if (scope) pipeline.push({ $match: { user: scope } })
  pipeline.push(
    { $unwind: '$progressRecords' },
    {
      $match: {
        'progressRecords.recordType': 'lesson',
        'progressRecords.lastAccessedAt': {
          $gte: span.start.toISOString(),
          $lt: span.end.toISOString(),
        },
      },
    },
    {
      $project: {
        _id: 0,
        date: { $substrBytes: ['$progressRecords.lastAccessedAt', 0, 10] },
        completed: { $eq: ['$progressRecords.status', 'completed'] },
      },
    },
  )

  return db.collection('user-progresses').aggregate<Row>(pipeline).toArray()
}
