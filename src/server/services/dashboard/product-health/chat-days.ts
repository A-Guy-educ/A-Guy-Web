/**
 * "User held a chat conversation" signal (spec §2 Engagement).
 *
 * Source: `conversations` docs where
 *   - `lastMessageAt` inside the signal span (BSON Date — comparable to
 *     window boundaries directly, unlike ISO-string user-progresses)
 *   - `$size(messages) >= 2` — proxy for "≥1 user message + ≥1 AI reply"
 *     since conversations store turn pairs in `messages[]`. See §9
 *     decisions in the PR body.
 *
 * courseId filter uses `contextRef.value` (the conversations schema
 * stores the course id there — see conversations.ts service).
 */

import { ObjectId, type Db } from 'mongodb'

import type { SignalSpan, UserDay } from './signal-types'

interface Row {
  userId: string
  date: string
}

export async function fetchChatDays(
  db: Db,
  span: SignalSpan,
  courseId: string | null,
): Promise<UserDay[]> {
  const match: Record<string, unknown> = {
    lastMessageAt: { $gte: span.start, $lt: span.end },
    archivedAt: { $exists: false },
    $expr: { $gte: [{ $size: { $ifNull: ['$messages', []] } }, 2] },
  }
  if (courseId) {
    const ref = ObjectId.isValid(courseId) ? new ObjectId(courseId) : courseId
    match['contextRef.value'] = { $in: [courseId, ref] }
  }

  return db
    .collection('conversations')
    .aggregate<Row>([
      { $match: match },
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
