/**
 * Product Health orchestrator. Ties params → periods → signals → metrics
 * → response payload.
 *
 * One Mongo round-trip pool (parallel queries via signal-repository) feeds
 * every KPI. All bucket math is in-memory after that so granularity /
 * threshold changes don't multiply DB load.
 */

import { getContentDb } from '@/infra/db/content-db'

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
): Promise<ProductHealthPayload> {
  const db = await getContentDb()
  const resolved = resolvePeriod(params, now)
  const span = { start: signalWindowStart(resolved), end: resolved.period.end }
  const [signals, availableCourses, availableGrades] = await Promise.all([
    fetchAllSignals(db, span, { courseId: params.courseId, grade: params.grade }),
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
