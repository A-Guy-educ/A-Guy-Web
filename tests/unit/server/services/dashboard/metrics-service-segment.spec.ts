/**
 * Segment wiring in computeDashboardMetrics.
 *
 * `all` must issue exactly the pre-segment queries (no class-roster read, no
 * cohort on any aggregation, no b2bMetrics). b2b/b2c pass the cohort to the
 * user aggregations only — engagement keeps the platform-wide user-stats.
 */

import { ObjectId } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const agg = vi.hoisted(() => ({
  aggregateCourseEnrollments: vi.fn(async () => []),
  aggregateGuestSessions: vi.fn(async () => ({ total: 0 })),
  aggregateLessonTypes: vi.fn(async () => ({ total: 0, learning: 0, practice: 0, exam: 0 })),
  aggregateMonthlySignups: vi.fn(async () => []),
  aggregateSessionTimeByLessonType: vi.fn(async () => ({})),
  aggregateSignupSources: vi.fn(async () => ({})),
  aggregateTokenMetrics: vi.fn(async () => ({})),
  aggregateTopLessonsByOpens: vi.fn(async () => []),
  aggregateTransactions: vi.fn(async () => ({})),
  aggregateUserStats: vi.fn(),
  aggregateUsers: vi.fn(async () => ({ total: 0 })),
  aggregateUsersPerCurrentCourse: vi.fn(async () => []),
  buildUserMetrics: vi.fn((input: { userStats: { tag: string } }) => ({
    statsFrom: input.userStats.tag,
  })),
  countSimpleContent: vi.fn(async () => ({})),
}))
const classesFind = vi.hoisted(() => vi.fn())
const aggregateB2bMetrics = vi.hoisted(() => vi.fn(async () => ({ schools: 1 })))

vi.mock('@/infra/db/content-db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/infra/db/content-db')>()),
  getContentDb: async () => ({
    collection: (name: string) => {
      if (name !== 'classes') throw new Error(`unexpected collection ${name}`)
      return { find: classesFind }
    },
  }),
}))
vi.mock('@/server/services/dashboard/ensure-indexes', () => ({
  ensureDashboardIndexes: vi.fn(async () => undefined),
}))
vi.mock('@/server/services/dashboard/admin-users', () => ({
  fetchAdminUserRefs: vi.fn(async () => ({ refs: [], stringIds: [] })),
}))
vi.mock('@/server/services/dashboard/aggregations', () => agg)
vi.mock('@/server/services/dashboard/guest-insights', () => ({
  aggregateGuestInsights: vi.fn(async () => ({})),
}))
vi.mock('@/server/services/dashboard/b2b-metrics', () => ({ aggregateB2bMetrics }))

import { computeDashboardMetrics } from '@/server/services/dashboard/metrics-service'

const student = new ObjectId()

beforeEach(() => {
  vi.clearAllMocks()
  classesFind.mockReturnValue({
    toArray: async () => [{ _id: new ObjectId(), school: new ObjectId(), students: [student] }],
  })
  agg.aggregateUserStats.mockImplementation(async (_db, _b, _a, cohort?: unknown) => ({
    tag: cohort ? 'cohort' : 'platform',
    avgTimeSpentMinutes: cohort ? 99 : 1,
    featureUsage: {},
  }))
})

describe('computeDashboardMetrics — segment', () => {
  it("'all' never reads classes and passes no cohort", async () => {
    const result = await computeDashboardMetrics('month')

    expect(classesFind).not.toHaveBeenCalled()
    expect(agg.aggregateUserStats).toHaveBeenCalledTimes(1)
    expect(agg.aggregateUsers.mock.calls[0][2]).toBeNull()
    expect(agg.aggregateSignupSources.mock.calls[0][2]).toBeNull()
    expect(agg.aggregateMonthlySignups.mock.calls[0][1]).toBeNull()
    expect(result.segment).toBe('all')
    expect(result).not.toHaveProperty('b2bMetrics')
  })

  it.each(['b2b', 'b2c'] as const)(
    "'%s' scopes user aggregations, keeps engagement platform-wide",
    async (segment) => {
      const result = await computeDashboardMetrics('month', segment)

      const cohort = agg.aggregateUsers.mock.calls[0][2] as { segment: string; refs: unknown[] }
      expect(cohort.segment).toBe(segment)
      expect(cohort.refs).toEqual([student.toString(), student])
      expect(agg.aggregateSignupSources.mock.calls[0][2]).toBe(cohort)
      expect(agg.aggregateMonthlySignups.mock.calls[0][1]).toBe(cohort)
      expect(result.userMetrics).toEqual({ statsFrom: 'cohort' })
      expect(result.engagement.avgTimeSpentMinutes).toBe(1)
      expect(result.segment).toBe(segment)
    },
  )

  it('attaches b2bMetrics only for b2b', async () => {
    expect((await computeDashboardMetrics('week', 'b2b')).b2bMetrics).toEqual({ schools: 1 })
    expect(await computeDashboardMetrics('week', 'b2c')).not.toHaveProperty('b2bMetrics')
  })
})
