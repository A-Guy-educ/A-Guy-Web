/**
 * Composes a `Metric` (value + comparison + delta + trend) from a KPI
 * calculator. Every rate goes through `computeRate`, so a bucket with
 * no denominator yields `null` — never 0 (spec §4, §6).
 */

import type { NumDenom } from './kpi-calculators'
import type { CountMetric, Metric, TrendBucket } from './types'
import { isoDate, type Window } from './windows'

export type KpiCalculator = (window: Window) => NumDenom

export function computeRate({ numerator, denominator }: NumDenom): number | null {
  if (denominator <= 0) return null
  return Math.round((numerator / denominator) * 100 * 10) / 10
}

function pp(current: number | null, prior: number | null): number | null {
  if (current === null || prior === null) return null
  return Math.round((current - prior) * 10) / 10
}

export interface BuildMetricInputs {
  calculator: KpiCalculator
  period: Window
  comparison: Window
  buckets: Window[]
}

export function buildMetric({
  calculator,
  period,
  comparison,
  buckets,
}: BuildMetricInputs): Metric {
  const primary = calculator(period)
  const comparisonPoint = calculator(comparison)
  const value = computeRate(primary)
  const comparisonValue = computeRate(comparisonPoint)
  const trend: TrendBucket[] = buckets.map((bucket) => {
    const { numerator, denominator } = calculator(bucket)
    const bucketValue = computeRate({ numerator, denominator })
    return {
      bucketStart: isoDate(bucket.start),
      bucketEnd: isoDate(bucket.end),
      value: bucketValue,
      numerator: denominator > 0 ? numerator : null,
      denominator: denominator > 0 ? denominator : null,
    }
  })

  return {
    value,
    numerator: primary.denominator > 0 ? primary.numerator : null,
    denominator: primary.denominator > 0 ? primary.denominator : null,
    comparisonValue,
    deltaPp: pp(value, comparisonValue),
    trend,
  }
}

export type CountCalculator = (window: Window) => number

export interface BuildCountMetricInputs {
  counter: CountCalculator
  period: Window
  comparison: Window
  buckets: Window[]
}

/**
 * Count-shaped metric (Total New Registered Users). A count of zero is a
 * real zero, not "no data", so values are never null here; `deltaAbs` is
 * the absolute difference against the equal-length prior window.
 */
export function buildCountMetric({
  counter,
  period,
  comparison,
  buckets,
}: BuildCountMetricInputs): CountMetric {
  const value = counter(period)
  const comparisonValue = counter(comparison)
  return {
    value,
    comparisonValue,
    deltaAbs: value - comparisonValue,
    trend: buckets.map((bucket) => ({
      bucketStart: isoDate(bucket.start),
      bucketEnd: isoDate(bucket.end),
      value: counter(bucket),
    })),
  }
}
