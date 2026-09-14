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
import { ensureDashboardIndexes } from './ensure-indexes'
import type { DashboardMetricsResponse, Period } from './metrics-types'

export async function computeDashboardMetrics(period: Period): Promise<DashboardMetricsResponse> {
  const db = await getContentDb()
  await ensureDashboardIndexes(db)

  const buckets = computeDateBuckets(period)
  // One lookup up-front so every downstream aggregation runs on the same
  // exclusion set. lesson-stats top-N/session-time widgets can't honour
  // this filter — those collections are pre-aggregated per lesson with no
  // user reference, so any admin activity that already touched them stays
  // baked in until a write-time guard lands separately.
  const adminUserRefs = await fetchAdminUserRefs(db)

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
  ] = await Promise.all([
    aggregateUserStats(db, buckets, adminUserRefs),
    aggregateUsers(db, buckets),
    aggregateGuestSessions(db, buckets, adminUserRefs),
    aggregateTransactions(db, buckets, adminUserRefs),
    aggregateCourseEnrollments(db, adminUserRefs),
    aggregateLessonTypes(db),
    countSimpleContent(db),
    aggregateMonthlySignups(db),
    aggregateTopLessonsByOpens(db),
    aggregateSessionTimeByLessonType(db),
    aggregateTokenMetrics(db, adminUserRefs),
    aggregateUsersPerCurrentCourse(db),
    aggregateSignupSources(db, buckets),
  ])

  return {
    period,
    userMetrics: buildUserMetrics({ userStats, users, guests, signupSourceBreakdown }),
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
  }
}
