/**
 * Product Health tab contract — shape returned under
 * `productHealth` on the /api/dashboard-metrics response. Consumed by
 * A-Guy-Dash PR #16; do not change field names or nullability without
 * coordinating with the widgets on that PR.
 *
 * Nulls are meaningful: `value: null` means "no denominator" (never
 * fall back to 0). Trend buckets follow the same rule so the chart can
 * render a gap instead of a floor.
 */

export type PeriodRange = '7d' | '30d' | '90d' | 'custom'
export type Granularity = 'daily' | 'weekly' | 'monthly'

// Spec v0.4: lessonCompletionRate removed; chatUsabilityRate intentionally
// not shipped (interactive lessons retired) — Dash treats it as optional.
export const PRODUCT_HEALTH_KPIS = [
  'activeUserRate',
  'engagementRate',
  'retentionRate',
  'inactiveChurnRate',
  'pdfScrollUsabilityRate',
] as const

export type ProductHealthKpi = (typeof PRODUCT_HEALTH_KPIS)[number]

export interface TrendBucket {
  bucketStart: string
  bucketEnd: string
  value: number | null
  numerator: number | null
  denominator: number | null
}

export interface Metric {
  value: number | null
  numerator: number | null
  denominator: number | null
  comparisonValue: number | null
  deltaPp: number | null
  trend: TrendBucket[]
}

export interface CountTrendBucket {
  bucketStart: string
  bucketEnd: string
  value: number | null
}

export interface CountMetric {
  value: number | null
  comparisonValue: number | null
  deltaAbs: number | null
  trend: CountTrendBucket[]
}

export interface AvailableCourse {
  id: string
  title: string
}

export interface ProductHealthPayload {
  periodStart: string
  periodEnd: string
  courseId: string | null
  /** Echo of the `grade` filter (courses.courseLabel), null = all grades. */
  grade: string | null
  granularity: Granularity
  /** Dwell threshold (seconds, single visit) that made a user Active. */
  activeDwellSeconds: number
  /** First fully-logged day of the per-visit log; earlier windows are null. */
  activityDataSince: string | null
  totalNewRegisteredUsers: CountMetric
  metrics: Record<ProductHealthKpi, Metric>
  availableCourses: AvailableCourse[]
  availableGrades: string[]
}
