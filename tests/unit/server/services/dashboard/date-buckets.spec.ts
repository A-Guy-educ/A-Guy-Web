import { describe, expect, it } from 'vitest'

import { computeDateBuckets } from '@/server/services/dashboard/date-buckets'
import { VALID_PERIODS } from '@/server/services/dashboard/metrics-types'

// Fixed reference in the middle of a month so no rollover math obscures the
// intent. Local-tz boundaries use setHours/setDate on the reference Date; the
// tests read those same boundaries back rather than reconstructing them, so
// they're timezone-agnostic.
const REFERENCE = new Date('2026-03-15T14:22:11.500Z')

describe('computeDateBuckets', () => {
  it('exposes day / week / month / year in VALID_PERIODS', () => {
    expect(VALID_PERIODS).toEqual(['day', 'week', 'month', 'year'])
  })

  describe("period='day'", () => {
    // The Dash "signup source breakdown" card's contract is that the buckets
    // sum to registeredToday. registeredToday matches `createdAt >= todayStart`;
    // aggregateSignupSources matches `createdAt >= periodStart`. Both filters
    // also apply `role !== 'admin'`. If periodStart drifts from todayStart the
    // invariant breaks silently, so pin the equality here.
    it('sets periodStart equal to todayStart so signup buckets sum to registeredToday', () => {
      const buckets = computeDateBuckets('day', REFERENCE)
      expect(buckets.periodStart.getTime()).toBe(buckets.todayStart.getTime())
      expect(buckets.periodStartStr).toBe(buckets.todayStr)
    })

    it('anchors periodStart at midnight local time (matches other daily fields)', () => {
      const buckets = computeDateBuckets('day', REFERENCE)
      expect(buckets.periodStart.getHours()).toBe(0)
      expect(buckets.periodStart.getMinutes()).toBe(0)
      expect(buckets.periodStart.getSeconds()).toBe(0)
      expect(buckets.periodStart.getMilliseconds()).toBe(0)
    })
  })

  describe("period='week'", () => {
    it('anchors periodStart 7 days before todayStart', () => {
      const buckets = computeDateBuckets('week', REFERENCE)
      const expected = new Date(buckets.todayStart)
      expected.setDate(expected.getDate() - 7)
      expect(buckets.periodStart.getTime()).toBe(expected.getTime())
    })
  })

  describe("period='month'", () => {
    it('anchors periodStart one month before todayStart', () => {
      const buckets = computeDateBuckets('month', REFERENCE)
      const expected = new Date(buckets.todayStart)
      expected.setMonth(expected.getMonth() - 1)
      expect(buckets.periodStart.getTime()).toBe(expected.getTime())
    })
  })

  describe("period='year'", () => {
    it('anchors periodStart one year before todayStart', () => {
      const buckets = computeDateBuckets('year', REFERENCE)
      const expected = new Date(buckets.todayStart)
      expected.setFullYear(expected.getFullYear() - 1)
      expect(buckets.periodStart.getTime()).toBe(expected.getTime())
    })
  })
})
