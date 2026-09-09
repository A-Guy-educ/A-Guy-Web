/**
 * Product Health orchestrator. Ties params → periods → signals → metrics
 * → response payload.
 *
 * One Mongo round-trip pool (four parallel queries via signal-repository)
 * feeds all five KPIs. All bucket math is in-memory after that so
 * granularity/course-filter changes don't multiply DB load.
 */

import { getContentDb } from '@/infra/db/content-db'

import { fetchAvailableCourses } from './available-courses'
import {
  activeUserRate,
  buildKpiContext,
  engagementRate,
  inactiveChurnRate,
  lessonCompletionRate,
  retentionRate,
  type KpiContext,
} from './kpi-calculators'
import { buildMetric, type KpiCalculator } from './metric-builder'
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
  lessonCompletionRate: (ctx) => (window) => lessonCompletionRate(ctx, window),
}

export async function computeProductHealth(
  params: ParsedProductHealthParams,
  now: Date = new Date(),
): Promise<ProductHealthPayload> {
  const db = await getContentDb()
  const resolved = resolvePeriod(params, now)
  const span = { start: signalWindowStart(resolved), end: resolved.period.end }
  const [signals, availableCourses] = await Promise.all([
    fetchAllSignals(db, span, params.courseId),
    fetchAvailableCourses(db),
  ])
  const ctx = buildKpiContext(signals, resolved.retentionLookbackDays)
  return {
    periodStart: isoDate(resolved.period.start),
    periodEnd: isoDate(resolved.period.end),
    courseId: params.courseId,
    granularity: params.granularity,
    metrics: buildAllMetrics(ctx, resolved),
    availableCourses,
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
