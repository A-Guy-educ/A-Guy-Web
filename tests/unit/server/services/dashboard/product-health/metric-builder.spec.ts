import { describe, expect, it } from 'vitest'

import { buildMetric, computeRate } from '@/server/services/dashboard/product-health/metric-builder'
import type { NumDenom } from '@/server/services/dashboard/product-health/kpi-calculators'
import type { Window } from '@/server/services/dashboard/product-health/windows'

const window = (start: string, end: string): Window => ({
  start: new Date(`${start}T00:00:00.000Z`),
  end: new Date(`${end}T00:00:00.000Z`),
})

const period = window('2026-03-01', '2026-03-08') // 7d
const comparison = window('2026-02-22', '2026-03-01')
const dailyBuckets = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(period.start.getTime() + i * 24 * 60 * 60 * 1000)
  const next = new Date(d.getTime() + 24 * 60 * 60 * 1000)
  return { start: d, end: next }
})

describe('computeRate', () => {
  it('returns null when denominator is zero (no fallback to 0)', () => {
    expect(computeRate({ numerator: 0, denominator: 0 })).toBeNull()
  })

  it('rounds rates to one decimal', () => {
    expect(computeRate({ numerator: 1, denominator: 3 })).toBe(33.3)
    expect(computeRate({ numerator: 2, denominator: 3 })).toBe(66.7)
  })
})

describe('buildMetric', () => {
  it('never averages daily rates into a weekly bucket — recomputes from raw counts', () => {
    // Daily rates 100%, 0%, 100%, 0%, 100%, 0%, 100% would average to ~57.1%.
    // The correct weekly rate over raw counts is 4/7 = 57.1% — but with an
    // asymmetric bucket set we can prove averaging is wrong.
    // 6 buckets at 100% (1/1), 1 bucket at 0% (0/1000): simple avg = 85.7%,
    // true recomputed value = 6 / 1006 = 0.6%.
    const perBucket = [
      { numerator: 1, denominator: 1 },
      { numerator: 1, denominator: 1 },
      { numerator: 1, denominator: 1 },
      { numerator: 1, denominator: 1 },
      { numerator: 1, denominator: 1 },
      { numerator: 1, denominator: 1 },
      { numerator: 0, denominator: 1000 },
    ]
    // Route each bucket call to its slot. Match on BOTH boundaries so a
    // full-period call (start matches bucket[0].start but end matches
    // period.end) doesn't get routed to bucket[0].
    const calculator = (w: Window): NumDenom => {
      const index = dailyBuckets.findIndex(
        (b) => b.start.getTime() === w.start.getTime() && b.end.getTime() === w.end.getTime(),
      )
      if (index >= 0) return perBucket[index]
      // period / comparison → sum of the raw counts
      return perBucket.reduce(
        (acc, cur) => ({
          numerator: acc.numerator + cur.numerator,
          denominator: acc.denominator + cur.denominator,
        }),
        { numerator: 0, denominator: 0 },
      )
    }

    const metric = buildMetric({ calculator, period, comparison, buckets: dailyBuckets })

    // True weekly rate — computed from summed numerator/denominator
    expect(metric.value).toBe(0.6)
    // The trend still shows the per-bucket rates unchanged
    expect(metric.trend.map((t) => t.value)).toEqual([100, 100, 100, 100, 100, 100, 0])
  })

  it('yields value=null and deltaPp=null when denominator is 0', () => {
    const metric = buildMetric({
      calculator: () => ({ numerator: 0, denominator: 0 }),
      period,
      comparison,
      buckets: dailyBuckets,
    })
    expect(metric.value).toBeNull()
    expect(metric.comparisonValue).toBeNull()
    expect(metric.deltaPp).toBeNull()
    expect(metric.numerator).toBeNull()
    expect(metric.denominator).toBeNull()
    expect(
      metric.trend.every((b) => b.value === null && b.numerator === null && b.denominator === null),
    ).toBe(true)
  })

  it('reports deltaPp in percentage points, one decimal', () => {
    // period: 4/10 = 40%; comparison: 2/10 = 20%; delta = +20.0 pp
    const numbers = new Map<string, NumDenom>([
      [period.start.toISOString(), { numerator: 4, denominator: 10 }],
      [comparison.start.toISOString(), { numerator: 2, denominator: 10 }],
    ])
    const metric = buildMetric({
      calculator: (w) => numbers.get(w.start.toISOString()) ?? { numerator: 0, denominator: 0 },
      period,
      comparison,
      buckets: [],
    })
    expect(metric.value).toBe(40)
    expect(metric.comparisonValue).toBe(20)
    expect(metric.deltaPp).toBe(20)
  })
})
