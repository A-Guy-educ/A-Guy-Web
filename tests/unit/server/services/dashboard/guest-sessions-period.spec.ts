/**
 * guestSessionsInPeriod / guestConvertedInPeriod — the Users-tab guest tile's
 * per-period cohort. Runs the real $facet branches from
 * buildGuestSessionsFacet through a minimal evaluator that supports only the
 * operators those branches use ($gte, $lt, $exists, $nin, $count), so the
 * filters are exercised against sample docs without a Mongo instance.
 */

import type { Db, Document } from 'mongodb'
import { describe, expect, it } from 'vitest'

import type { AdminUserRefs } from '@/server/services/dashboard/admin-users'
import { aggregateGuestSessions } from '@/server/services/dashboard/aggregations'
import { computeDateBuckets, type DateBuckets } from '@/server/services/dashboard/date-buckets'
import { VALID_PERIODS } from '@/server/services/dashboard/metrics-types'

const REFERENCE = new Date('2026-03-15T14:22:11.500Z')
const ADMIN_ID = 'admin-1'
const ADMIN_REFS: AdminUserRefs = { refs: [ADMIN_ID], stringIds: [ADMIN_ID] }
const HOUR_MS = 60 * 60 * 1000

type GuestDoc = { createdAt: Date; claimedByUser?: string }

function matchesCondition(value: unknown, cond: Record<string, unknown>): boolean {
  return Object.entries(cond).every(([op, arg]) => {
    if (op === '$gte') return value instanceof Date && value >= (arg as Date)
    if (op === '$lt') return value instanceof Date && value < (arg as Date)
    if (op === '$exists') return (value !== undefined) === arg
    if (op === '$nin') return !(arg as unknown[]).includes(value)
    throw new Error(`evaluator does not support ${op}`)
  })
}

function runBranch(docs: GuestDoc[], stages: Document[]): Array<{ n: number }> {
  let rows: GuestDoc[] = docs
  for (const stage of stages) {
    if (stage.$match) {
      const filter = stage.$match as Record<string, Record<string, unknown>>
      rows = rows.filter((doc) =>
        Object.entries(filter).every(([field, cond]) =>
          matchesCondition((doc as Record<string, unknown>)[field], cond),
        ),
      )
    } else if (stage.$count) {
      return rows.length ? [{ n: rows.length }] : []
    } else {
      throw new Error(`evaluator does not support stage ${Object.keys(stage)[0]}`)
    }
  }
  throw new Error('branch must end with $count')
}

function fakeDb(docs: GuestDoc[]): Db {
  return {
    collection: () => ({
      aggregate: (pipeline: Document[]) => ({
        toArray: async () => {
          const facet = pipeline[0]?.$facet as Record<string, Document[]>
          const out = Object.fromEntries(
            Object.entries(facet).map(([key, stages]) => [key, runBranch(docs, stages)]),
          )
          return [out]
        },
      }),
    }),
  } as unknown as Db
}

function guestsAround(buckets: DateBuckets, claims: { inside?: string; before?: string } = {}) {
  return {
    inside: {
      createdAt: new Date(buckets.periodStart.getTime() + HOUR_MS),
      ...(claims.inside ? { claimedByUser: claims.inside } : {}),
    },
    before: {
      createdAt: new Date(buckets.periodStart.getTime() - HOUR_MS),
      ...(claims.before ? { claimedByUser: claims.before } : {}),
    },
  }
}

describe('aggregateGuestSessions — period cohort', () => {
  it.each(VALID_PERIODS)(
    "period='%s': counts a guest created after periodStart, not one before",
    async (period) => {
      const buckets = computeDateBuckets(period, REFERENCE)
      const { inside, before } = guestsAround(buckets, { inside: 'user-1' })
      const result = await aggregateGuestSessions(fakeDb([inside, before]), buckets, ADMIN_REFS)

      expect(result.inPeriod).toBe(1)
      expect(result.convertedInPeriod).toBe(1)
    },
  )

  it('counts a guest created exactly at periodStart (inclusive bound)', async () => {
    const buckets = computeDateBuckets('week', REFERENCE)
    const docs = [{ createdAt: new Date(buckets.periodStart), claimedByUser: 'user-1' }]
    const result = await aggregateGuestSessions(fakeDb(docs), buckets, ADMIN_REFS)

    expect(result.inPeriod).toBe(1)
    expect(result.convertedInPeriod).toBe(1)
  })

  it('excludes admin claims from guestConvertedInPeriod but keeps the guest', async () => {
    const buckets = computeDateBuckets('month', REFERENCE)
    const { inside } = guestsAround(buckets, { inside: ADMIN_ID })
    const result = await aggregateGuestSessions(fakeDb([inside]), buckets, ADMIN_REFS)

    expect(result.inPeriod).toBe(1)
    expect(result.convertedInPeriod).toBe(0)
  })

  it('does not count an older guest claimed during the period (cohort, not claim date)', async () => {
    const buckets = computeDateBuckets('month', REFERENCE)
    // claimedAt would fall inside the period, but the guest was created before it.
    const { before } = guestsAround(buckets, { before: 'user-1' })
    const result = await aggregateGuestSessions(fakeDb([before]), buckets, ADMIN_REFS)

    expect(result.inPeriod).toBe(0)
    expect(result.convertedInPeriod).toBe(0)
    expect(result.converted).toBe(1) // all-time field unchanged
  })

  it('returns 0 for both fields when no guests were created in the period', async () => {
    const buckets = computeDateBuckets('day', REFERENCE)
    const result = await aggregateGuestSessions(fakeDb([]), buckets, ADMIN_REFS)

    expect(result.inPeriod).toBe(0)
    expect(result.convertedInPeriod).toBe(0)
  })

  it('never reports more converted than guests in the period', async () => {
    const buckets = computeDateBuckets('year', REFERENCE)
    const docs: GuestDoc[] = [
      ...Object.values(guestsAround(buckets, { inside: 'u1', before: 'u2' })),
      { createdAt: new Date(buckets.periodStart.getTime() + 2 * HOUR_MS) },
      { createdAt: new Date(buckets.periodStart.getTime() + 3 * HOUR_MS), claimedByUser: ADMIN_ID },
    ]
    const result = await aggregateGuestSessions(fakeDb(docs), buckets, ADMIN_REFS)

    expect(result.inPeriod).toBe(3)
    expect(result.convertedInPeriod).toBe(1)
    expect(result.convertedInPeriod).toBeLessThanOrEqual(result.inPeriod)
  })
})
