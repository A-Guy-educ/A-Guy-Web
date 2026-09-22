/**
 * Fetches every raw signal the Product Health KPIs need. One round-trip
 * to resolve the eligible-user pool (spec §9 exclusion rules + courseId
 * filter), then four parallel Mongo queries scoped to that pool.
 *
 * Design note: we intentionally fetch flat (userId, date) tuples for the
 * full signal span rather than pre-bucketing in Mongo. Bucketing lives
 * in `kpi-calculators.ts` so the "no averaging of daily rates" rule
 * (spec §4) is enforced once, in a pure function that's easy to unit-test.
 */

import { type Db } from 'mongodb'

import { fetchChatDays } from './chat-days'
import { fetchEligibleUsers } from './eligible-users'
import { fetchLessonActiveDays } from './lesson-active-days'
import { fetchLessonAttempts } from './lesson-attempts'
import { fetchPresentUserDays } from './present-user-days'
import type { AllSignals, SignalSpan } from './signal-types'

export async function fetchAllSignals(
  db: Db,
  span: SignalSpan,
  courseId: string | null,
): Promise<AllSignals> {
  const eligible = await fetchEligibleUsers(db, span, courseId)
  const [lessonActiveDays, chatDays, lessonAttempts, presentUserDays] = await Promise.all([
    fetchLessonActiveDays(db, span, eligible.refs),
    fetchChatDays(db, span, eligible.refs),
    fetchLessonAttempts(db, span, eligible.refs),
    fetchPresentUserDays(db, span, eligible.refs),
  ])
  return {
    lessonActiveDays,
    chatDays,
    lessonAttempts,
    presentUserDays,
  }
}
