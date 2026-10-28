/**
 * Fetches every raw signal the Product Health KPIs need. One round-trip
 * to resolve the eligible-user pool (spec §9 exclusion rules + courseId /
 * grade filter), then parallel Mongo queries scoped to that pool.
 *
 * Design note: we intentionally fetch flat per-day tuples for the full
 * signal span rather than pre-bucketing in Mongo. Bucketing lives in
 * `kpi-calculators.ts` so the "no averaging of daily rates" rule (spec §4)
 * is enforced once, in a pure function that's easy to unit-test.
 */

import { type Db } from 'mongodb'

import { fetchChatDays } from './chat-days'
import { fetchEligibleUsers, type UserScope } from './eligible-users'
import { fetchPdfVisitDays, fetchVisitDays, fetchVisitLogCoverageStart } from './lesson-visit-days'
import type { AllSignals, SignalSpan } from './signal-types'

export async function fetchAllSignals(
  db: Db,
  span: SignalSpan,
  scope: UserScope,
): Promise<AllSignals> {
  const eligible = await fetchEligibleUsers(db, span, scope)
  const [visitDays, chatDays, pdfVisitDays, visitLogCoverageStart] = await Promise.all([
    fetchVisitDays(db, span, eligible.refs),
    fetchChatDays(db, span, eligible.refs),
    fetchPdfVisitDays(db, span, eligible.refs),
    fetchVisitLogCoverageStart(db),
  ])
  return {
    visitDays,
    chatDays,
    pdfVisitDays,
    registrationDays: eligible.registrationDays,
    visitLogCoverageStart,
  }
}
