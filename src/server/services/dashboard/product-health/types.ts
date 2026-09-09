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

export const PRODUCT_HEALTH_KPIS = [
  'activeUserRate',
  'engagementRate',
  'retentionRate',
  'inactiveChurnRate',
  'lessonCompletionRate',
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

export interface AvailableCourse {
  id: string
  title: string
}

export interface ProductHealthPayload {
  periodStart: string
  periodEnd: string
  courseId: string | null
  granularity: Granularity
  metrics: Record<ProductHealthKpi, Metric>
  availableCourses: AvailableCourse[]
}
