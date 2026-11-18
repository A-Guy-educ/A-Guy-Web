/**
 * Product Health orchestrator. Ties params → periods → signals → metrics
 * → response payload.
 *
 * One Mongo round-trip pool (parallel queries via signal-repository) feeds
 * every KPI. All bucket math is in-memory after that so granularity /
 * threshold changes don't multiply DB load.
 */

import { getContentDb } from '@/infra/db/content-db'

import type { UserSegment } from '../metrics-types'
import { buildUserCohort, fetchClassRoster, fetchUserSegments } from '../user-segment'

import { fetchAvailableCourses, fetchAvailableGrades } from './available-courses'
import {
  activeUserRate,
  buildKpiContext,
  engagementRate,
  inactiveChurnRate,
  newRegistrations,
  pdfScrollUsabilityRate,
  retentionRate,
  type KpiContext,
} from './kpi-calculators'
import { buildCountMetric, buildMetric, type KpiCalculator } from './metric-builder'
import type { ParsedProductHealthParams } from './params'
import { fetchAllSignals } from './signal-repository'
import type { Metric, ProductHealthKpi, ProductHealthPayload } from './types'
import { PRODUCT_HEALTH_KPIS } from './types'
import { isoDate, resolvePeriod, signalWindowStart, type ResolvedPeriod } from './windows'

const CALCULATOR_MAP: Record<ProductHealthKpi, (ctx: KpiContext) => KpiCalculator> = {
  activeUserRate: (ctx) => (window) => activeUserRate(ctx, window),
  engagementRate: (ctx) => (window) => engagementRate(ctx, window),
  retentionRate: (ctx) => (window) => retentionRate(ctx, window),
  inactiveChurnRate: (ctx) => (window) => inactiveChurnRate(ctx, window),
  pdfScrollUsabilityRate: (ctx) => (window) => pdfScrollUsabilityRate(ctx, window),
}

export async function computeProductHealth(
  params: ParsedProductHealthParams,
  now: Date = new Date(),
  segment: UserSegment = 'all',
): Promise<ProductHealthPayload> {
  const db = await getContentDb()
  const resolved = resolvePeriod(params, now)
  const span = { start: signalWindowStart(resolved), end: resolved.period.end }
  // Rebuilt here rather than shared with computeDashboardMetrics: the two run
  // in parallel and the lookups are small, so keeping them independent is simpler.
  const cohort =
    segment === 'all'
      ? null
      : buildUserCohort(segment, await fetchUserSegments(db, await fetchClassRoster(db)))
  const [signals, availableCourses, availableGrades] = await Promise.all([
    fetchAllSignals(db, span, { courseId: params.courseId, grade: params.grade, cohort }),
    fetchAvailableCourses(db),
    fetchAvailableGrades(db),
  ])
  const ctx = buildKpiContext(signals, {
    retentionLookbackDays: resolved.retentionLookbackDays,
    activeDwellSeconds: params.activeDwellSeconds,
  })
  return {
    periodStart: isoDate(resolved.period.start),
    periodEnd: isoDate(resolved.period.end),
    courseId: params.courseId,
    grade: params.grade,
    granularity: params.granularity,
    activeDwellSeconds: params.activeDwellSeconds,
    activityDataSince: signals.visitLogCoverageStart,
    totalNewRegisteredUsers: buildCountMetric({
      counter: (window) => newRegistrations(ctx, window),
      period: resolved.period,
      comparison: resolved.comparison,
      buckets: resolved.buckets,
    }),
    metrics: buildAllMetrics(ctx, resolved),
    availableCourses,
    availableGrades,
  }
}

function buildAllMetrics(
  ctx: KpiContext,
  resolved: ResolvedPeriod,
): Record<ProductHealthKpi, Metric> {
  const entries = PRODUCT_HEALTH_KPIS.map<[ProductHealthKpi, Metric]>((kpi) => [
    kpi,
    buildMetric({
      calculator: CALCULATOR_MAP[kpi](ctx),
      period: resolved.period,
      comparison: resolved.comparison,
      buckets: resolved.buckets,
    }),
  ])
  return Object.fromEntries(entries) as Record<ProductHealthKpi, Metric>
}
