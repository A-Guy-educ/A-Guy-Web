/**
 * "User held a chat conversation" signal (spec §2 Engagement, §9.2).
 *
 * Source: `conversations` docs where
 *   - `lastMessageAt` inside the signal span (BSON Date — comparable to
 *     window boundaries directly, unlike ISO-string user-progresses)
 *   - `$size(messages) >= 2` — proxy for "≥1 user message + ≥1 AI reply"
 *     since conversations store turn pairs in `messages[]`.
 *
 * Restricted to the eligible-user pool so admin/test-domain accounts
 * never enter the numerator or denominator.
 *
 * courseId filter is applied *upstream* via the eligible-user pool
 * (users whose currentCourse matches). We deliberately do NOT filter on
 * `contextRef.value` here — a course-scoped user's chats about other
 * things still count as engagement for that user.
 */

import { type Db } from 'mongodb'

import type { SignalSpan, UserDay } from './signal-types'

interface Row {
  userId: string
  date: string
}

export async function fetchChatDays(
  db: Db,
  span: SignalSpan,
  eligibleRefs: unknown[],
): Promise<UserDay[]> {
  if (eligibleRefs.length === 0) return []
  return db
    .collection('conversations')
    .aggregate<Row>([
      {
        $match: {
          user: { $in: eligibleRefs },
          lastMessageAt: { $gte: span.start, $lt: span.end },
          archivedAt: { $exists: false },
          $expr: { $gte: [{ $size: { $ifNull: ['$messages', []] } }, 2] },
        },
      },
      {
        $group: {
          _id: {
            user: '$user',
            day: { $dateToString: { format: '%Y-%m-%d', date: '$lastMessageAt' } },
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
