/**
 * "Lesson started / completed" signal (spec §2 Lesson Completion Rate,
 * §9.4).
 *
 * Source: `user-progresses.progressRecords[]` with
 *   - `recordType === 'lesson'`
 *   - `lastAccessedAt` inside the signal span
 * Restricted to the eligible-user pool so admin/test-domain attempts
 * never enter the numerator or denominator.
 *
 * Returned one row per record so the calculator can bucket by day
 * without averaging (§4). `completed` = status === 'completed'.
 *
 * §9.4 cohort logic: a lesson opened before the window and finished
 * inside it counts as both started and completed in the bucket that
 * contains `lastAccessedAt`. Records fully outside the window are
 * excluded either way. Matches "activity happened here" without needing
 * a separate startAt field the schema doesn't currently store.
 */

import { type Db } from 'mongodb'

import type { LessonAttempt, SignalSpan } from './signal-types'

interface Row {
  date: string
  completed: boolean
}

export async function fetchLessonAttempts(
  db: Db,
  span: SignalSpan,
  eligibleRefs: unknown[],
): Promise<LessonAttempt[]> {
  if (eligibleRefs.length === 0) return []
  return db
    .collection('user-progresses')
    .aggregate<Row>([
      { $match: { user: { $in: eligibleRefs } } },
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
    ])
    .toArray()
}
