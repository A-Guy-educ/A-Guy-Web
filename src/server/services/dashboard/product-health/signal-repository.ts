/**
 * Fetches every raw signal the Product Health KPIs need in one round-trip
 * per collection (four parallel Mongo queries).
 *
 * Design note: we intentionally fetch flat (userId, date) tuples for the
 * full signal span rather than pre-bucketing in Mongo. Bucketing lives
 * in `kpi-calculators.ts` so the "no averaging of daily rates" rule
 * (spec §4) is enforced once, in a pure function that's easy to unit-test.
 */

import { type Db } from 'mongodb'

import { fetchChatDays } from './chat-days'
import { fetchIdentifiedPopulation } from './identified-population'
import { fetchLessonActiveDays } from './lesson-active-days'
import { fetchLessonAttempts } from './lesson-attempts'
import type { AllSignals, SignalSpan } from './signal-types'

export async function fetchAllSignals(
  db: Db,
  span: SignalSpan,
  courseId: string | null,
): Promise<AllSignals> {
  const [population, lessonActiveDays, chatDays, lessonAttempts] = await Promise.all([
    fetchIdentifiedPopulation(db, span, courseId),
    fetchLessonActiveDays(db, span, courseId),
    fetchChatDays(db, span, courseId),
    fetchLessonAttempts(db, span, courseId),
  ])
  return { population, lessonActiveDays, chatDays, lessonAttempts }
}
