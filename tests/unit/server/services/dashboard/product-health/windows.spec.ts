import { describe, expect, it } from 'vitest'

import {
  isoDate,
  resolvePeriod,
  signalWindowStart,
} from '@/server/services/dashboard/product-health/windows'
import type { ParsedProductHealthParams } from '@/server/services/dashboard/product-health/params'

const NOW = new Date('2026-03-15T09:41:00.000Z')

function make(overrides: Partial<ParsedProductHealthParams> = {}): ParsedProductHealthParams {
  return {
    range: '30d',
    start: null,
    end: null,
    courseId: null,
    granularity: 'daily',
    ...overrides,
  }
}

describe('resolvePeriod', () => {
  it('defaults to a 30-day period ending at tomorrow UTC-midnight', () => {
    const resolved = resolvePeriod(make(), NOW)
    expect(isoDate(resolved.period.end)).toBe('2026-03-16')
    expect(isoDate(resolved.period.start)).toBe('2026-02-14')
    expect(resolved.comparison.start.toISOString()).toBe('2026-01-15T00:00:00.000Z')
    expect(resolved.comparison.end.toISOString()).toBe('2026-02-14T00:00:00.000Z')
  })

  it('emits one bucket per day at daily granularity', () => {
    const resolved = resolvePeriod(make({ range: '7d' }), NOW)
    expect(resolved.buckets).toHaveLength(7)
    expect(isoDate(resolved.buckets[0].start)).toBe('2026-03-09')
    expect(isoDate(resolved.buckets[6].end)).toBe('2026-03-16')
  })

  it('emits weekly buckets that clip to the period end', () => {
    const resolved = resolvePeriod(make({ range: '30d', granularity: 'weekly' }), NOW)
    // 30 days / 7 = 4 full weeks + 2 remainder days
    expect(resolved.buckets).toHaveLength(5)
    expect(isoDate(resolved.buckets[0].end)).toBe('2026-02-21')
    expect(isoDate(resolved.buckets.at(-1)!.end)).toBe('2026-03-16')
  })

  it('emits monthly buckets that walk the calendar', () => {
    const resolved = resolvePeriod(make({ range: '90d', granularity: 'monthly' }), NOW)
    // 90d span → at least 3 monthly buckets
    expect(resolved.buckets.length).toBeGreaterThanOrEqual(3)
    for (const bucket of resolved.buckets) {
      expect(bucket.start.getTime()).toBeLessThan(bucket.end.getTime())
    }
  })

  it('honours a custom range and treats end as inclusive', () => {
    const resolved = resolvePeriod(
      make({ range: 'custom', start: '2026-03-01', end: '2026-03-07' }),
      NOW,
    )
    expect(isoDate(resolved.period.start)).toBe('2026-03-01')
    // end='2026-03-07' → exclusive boundary is 2026-03-08 so the last day counts
    expect(isoDate(resolved.period.end)).toBe('2026-03-08')
    expect(resolved.buckets).toHaveLength(7)
  })
})

describe('signalWindowStart', () => {
  it('is 30 days before the earliest window we need', () => {
    const resolved = resolvePeriod(make({ range: '30d' }), NOW)
    const signalStart = signalWindowStart(resolved)
    // earliest of comparison.start / bucket[0].start is comparison.start = 2026-01-15
    // → signalWindowStart = 2025-12-16
    expect(isoDate(signalStart)).toBe('2025-12-16')
  })
})
