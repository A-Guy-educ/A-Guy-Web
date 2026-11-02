/**
 * Dashboard metrics orchestrator.
 *
 * Runs all aggregations in parallel and assembles the DashboardMetricsResponse
 * that the ported widgets consume. Ensures required indexes on first hit;
 * the per-collection $facet pipelines then rely on them for the perf target
 * (<500ms warm, <2s cold on Vercel Node runtime).
 */

import { getContentDb } from '@/infra/db/content-db'

import { fetchAdminUserRefs } from './admin-users'
import {
  aggregateCourseEnrollments,
  aggregateGuestSessions,
  aggregateLessonTypes,
  aggregateMonthlySignups,
  aggregateSessionTimeByLessonType,
  aggregateSignupSources,
  aggregateTokenMetrics,
  aggregateTopLessonsByOpens,
  aggregateTransactions,
  aggregateUserStats,
  aggregateUsers,
  aggregateUsersPerCurrentCourse,
  buildUserMetrics,
  countSimpleContent,
} from './aggregations'
import { computeDateBuckets } from './date-buckets'
import { aggregateB2bMetrics } from './b2b-metrics'
import { ensureDashboardIndexes } from './ensure-indexes'
import { aggregateGuestInsights } from './guest-insights'
import type { DashboardMetricsResponse, Period, UserSegment } from './metrics-types'
import { buildUserCohort, fetchClassRoster, type ClassRoster } from './user-segment'

export async function computeDashboardMetrics(
  period: Period,
  segment: UserSegment = 'all',
): Promise<DashboardMetricsResponse> {
  const db = await getContentDb()
  await ensureDashboardIndexes(db)

  const buckets = computeDateBuckets(period)
  // One lookup up-front so every downstream aggregation runs on the same
  // exclusion set. lesson-stats top-N/session-time widgets can't honour
  // this filter — those collections are pre-aggregated per lesson with no
  // user reference, so any admin activity that already touched them stays
  // baked in until a write-time guard lands separately.
  // The class roster is only read for b2b/b2c, so `all` runs exactly the
  // same queries as before segments existed.
  const [adminUserRefs, roster] = await Promise.all([
    fetchAdminUserRefs(db),
    segment === 'all' ? Promise.resolve<ClassRoster | null>(null) : fetchClassRoster(db),
  ])
  const cohort = roster ? buildUserCohort(segment, roster) : null

  const [
    userStats,
    users,
    guests,
    revenueMetrics,
    courseEnrollments,
    lessons,
    simpleCounts,
    monthlySignups,
    topLessons,
    sessionTimeByLessonType,
    tokenMetrics,
    usersPerCourse,
    signupSourceBreakdown,
    guestInsights,
    cohortUserStats,
    b2bMetrics,
  ] = await Promise.all([
    aggregateUserStats(db, buckets, adminUserRefs),
    aggregateUsers(db, buckets, cohort),
    aggregateGuestSessions(db, buckets, adminUserRefs),
    aggregateTransactions(db, buckets, adminUserRefs),
    aggregateCourseEnrollments(db, adminUserRefs),
    aggregateLessonTypes(db),
    countSimpleContent(db),
    aggregateMonthlySignups(db, cohort),
    aggregateTopLessonsByOpens(db),
    aggregateSessionTimeByLessonType(db),
    aggregateTokenMetrics(db, adminUserRefs),
    aggregateUsersPerCurrentCourse(db),
    aggregateSignupSources(db, buckets, cohort),
    aggregateGuestInsights(db, buckets, adminUserRefs),
    // Engagement (time spread, feature usage) stays platform-wide, so the
    // cohort-scoped user-stats pass is a second query feeding userMetrics only.
    cohort ? aggregateUserStats(db, buckets, adminUserRefs, cohort) : Promise.resolve(null),
    roster && segment === 'b2b'
      ? aggregateB2bMetrics(db, roster, buckets, adminUserRefs)
      : Promise.resolve(undefined),
  ])

  return {
    period,
    segment,
    userMetrics: buildUserMetrics({
      userStats: cohortUserStats ?? userStats,
      users,
      guests,
      signupSourceBreakdown,
    }),
    monthlySignups,
    contentCounts: {
      courses: simpleCounts.courses,
      lessons: lessons.total,
      exercises: simpleCounts.exercises,
      formulaSheets: simpleCounts.formulaSheets,
      prompts: simpleCounts.prompts,
    },
    engagement: {
      avgTimeSpentMinutes: userStats.avgTimeSpentMinutes,
      medianTimeSpentMinutes: userStats.medianTimeSpentMinutes,
      stdDevTimeSpentMinutes: userStats.stdDevTimeSpentMinutes,
      courseEnrollments,
      usersPerCourse,
      topLessons,
      sessionTimeByLessonType,
      featureUsage: userStats.featureUsage,
      lessonTypeUsage: {
        learning: lessons.learning,
        practice: lessons.practice,
        exam: lessons.exam,
      },
    },
    revenueMetrics,
    tokenMetrics,
    guestInsights,
    ...(b2bMetrics ? { b2bMetrics } : {}),
  }
}
