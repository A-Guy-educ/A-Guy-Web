/**
 * "Identified user was present in the window" signal — denominator for
 * `activeUserRate`. Same span-scoping as the numerator so the rate reads
 * as "% of users who showed up and became Active" rather than "% of the
 * historical user base who happened to be Active this window" (which
 * mechanically decays as the user base grows).
 *
 * Source: `user-progresses.progressRecords[]` with `lastAccessedAt`
 * inside the signal span — any recordType, no dwell floor. Any lesson
 * open or exercise interaction counts as "showed up." This is a strict
 * superset of `lessonActiveDays` (the numerator source), which keeps the
 * rate ≤ 100% by construction.
 *
 * Restricted to the eligible-user pool so admin/test-domain accounts
 * never enter the denominator.
 */

import { type Db } from 'mongodb'

import type { SignalSpan, UserDay } from './signal-types'

interface Row {
  userId: string
  date: string
}

export async function fetchPresentUserDays(
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
