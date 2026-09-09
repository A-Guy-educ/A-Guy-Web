/**
 * "User was active in a lesson" signal (spec §2 Active User definition —
 * lesson_started + dwell >60s).
 *
 * Source: `user-progresses.progressRecords[]` with
 *   - `recordType === 'lesson'`
 *   - `timeSpentSeconds >= 60` (cumulative on the record; see §9 note)
 *   - `lastAccessedAt` inside the signal span
 *
 * Returns one row per (userId, day) tuple. Callers reduce over windows
 * without averaging (spec §4).
 */

import { type Db } from 'mongodb'

import { courseUserFilter } from './course-filter'
import type { SignalSpan, UserDay } from './signal-types'

interface Row {
  userId: string
  date: string
}

export async function fetchLessonActiveDays(
  db: Db,
  span: SignalSpan,
  courseId: string | null,
): Promise<UserDay[]> {
  const scope = await courseUserFilter(db, courseId)
  const pipeline: Record<string, unknown>[] = []
  if (scope) pipeline.push({ $match: { user: scope } })
  pipeline.push(
    { $unwind: '$progressRecords' },
    {
      $match: {
        'progressRecords.recordType': 'lesson',
        'progressRecords.timeSpentSeconds': { $gte: 60 },
        'progressRecords.lastAccessedAt': {
          $gte: span.start.toISOString(),
          $lt: span.end.toISOString(),
        },
      },
    },
    {
      $group: {
        _id: {
          user: '$user',
          day: { $substrBytes: ['$progressRecords.lastAccessedAt', 0, 10] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        userId: { $toString: '$_id.user' },
        date: '$_id.day',
      },
    },
  )

  return db.collection('user-progresses').aggregate<Row>(pipeline).toArray()
}
