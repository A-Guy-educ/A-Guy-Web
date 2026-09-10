/**
 * "User was active in a lesson" signal (spec §2 Active User definition —
 * lesson_started + dwell >60s).
 *
 * Source: `user-progresses.progressRecords[]` with
 *   - `recordType === 'lesson'`
 *   - `timeSpentSeconds >= 60`
 *   - `lastAccessedAt` inside the signal span
 *
 * §9.1 note: `timeSpentSeconds` is cumulative across all sessions of a
 * lesson (bumped by /api/stats/heartbeat in 1-120s batches). A lesson
 * touched twice for 30s each counts once the second visit crosses 60s.
 * That's a v1 proxy for "session dwell >60s" — v2 target is a per-session
 * dwell log emitted from the lesson viewer.
 *
 * Returns one row per (userId, day) tuple. Callers reduce over windows
 * without averaging (spec §4).
 */

import { type Db } from 'mongodb'

import type { SignalSpan, UserDay } from './signal-types'

interface Row {
  userId: string
  date: string
}

export async function fetchLessonActiveDays(
  db: Db,
  span: SignalSpan,
  eligibleRefs: unknown[],
): Promise<UserDay[]> {
  if (eligibleRefs.length === 0) return []
  return db
    .collection('user-progresses')
    .aggregate<Row>([
      { $match: { user: { $in: eligibleRefs } } },
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
    ])
    .toArray()
}
