/**
 * Segment wiring in computeDashboardMetrics.
 *
 * `all` passes no cohort to any aggregation, skips the segment lookups and
 * attaches no b2bMetrics. The class roster is read for every segment because
 * revenue's B2B seat estimate needs it. b2b/other/b2c pass one cohort to the
 * user, engagement, token and guest aggregations.
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
  aggregateUserStats: vi.fn(),
  aggregateUsers: vi.fn(async () => ({ total: 0 })),
  aggregateUsersPerCurrentCourse: vi.fn(async () => []),
  buildUserMetrics: vi.fn((input: { userStats: { tag: string } }) => ({
    statsFrom: input.userStats.tag,
  })),
  countSimpleContent: vi.fn(async () => ({})),
}))
const classesFind = vi.hoisted(() => vi.fn())
const usersFind = vi.hoisted(() => vi.fn())
const guestSessionsFind = vi.hoisted(() => vi.fn())
const aggregateB2bMetrics = vi.hoisted(() => vi.fn(async () => ({ schools: 1 })))
const aggregateTransactions = vi.hoisted(() => vi.fn(async () => ({})))

vi.mock('@/infra/db/content-db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/infra/db/content-db')>()),
  getContentDb: async () => ({
    collection: (name: string) => {
      const finders: Record<string, unknown> = {
        classes: classesFind,
        users: usersFind,
        'guest-sessions': guestSessionsFind,
      }
      if (!finders[name]) throw new Error(`unexpected collection ${name}`)
      return { find: finders[name] }
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
const aggregateGuestInsights = vi.hoisted(() => vi.fn(async () => ({})))
vi.mock('@/server/services/dashboard/guest-insights', () => ({ aggregateGuestInsights }))
vi.mock('@/server/services/dashboard/b2b-metrics', () => ({ aggregateB2bMetrics }))
vi.mock('@/server/services/dashboard/revenue-metrics', () => ({ aggregateTransactions }))

import { computeDashboardMetrics } from '@/server/services/dashboard/metrics-service'

const student = new ObjectId()
const schoolUser = new ObjectId()

beforeEach(() => {
  vi.clearAllMocks()
  classesFind.mockReturnValue({
    toArray: async () => [{ _id: new ObjectId(), school: new ObjectId(), students: [student] }],
  })
  usersFind.mockReturnValue({
    toArray: async () => [{ _id: schoolUser, email: 'pupil@inbar.school' }],
  })
  guestSessionsFind.mockReturnValue({ toArray: async () => [] })
  agg.aggregateUserStats.mockImplementation(async (_db, _b, _a, cohort?: unknown) => ({
    tag: cohort ? 'cohort' : 'platform',
    avgTimeSpentMinutes: cohort ? 99 : 1,
    featureUsage: {},
  }))
})

describe('computeDashboardMetrics — segment', () => {
  it("'all' passes no cohort but still hands the roster to revenue", async () => {
    const result = await computeDashboardMetrics('month')

    expect(classesFind).toHaveBeenCalledTimes(1)
    expect(usersFind).not.toHaveBeenCalled()
    expect(guestSessionsFind).not.toHaveBeenCalled()
    const roster = aggregateTransactions.mock.calls[0][3] as { students: Set<string> }
    expect([...roster.students]).toEqual([student.toString()])
    expect(agg.aggregateUserStats).toHaveBeenCalledTimes(1)
    expect(agg.aggregateUsers.mock.calls[0][2]).toBeNull()
    expect(agg.aggregateUserStats.mock.calls[0][3]).toBeNull()
    expect(agg.aggregateSignupSources.mock.calls[0][2]).toBeNull()
    expect(agg.aggregateMonthlySignups.mock.calls[0][1]).toBeNull()
    expect(result.segment).toBe('all')
    expect(result).not.toHaveProperty('b2bMetrics')
  })

  it.each([
    ['b2b', 'in', [student.toString()]],
    ['other', 'in', [schoolUser.toString()]],
    ['b2c', 'nin', [student.toString(), schoolUser.toString()]],
  ] as const)("'%s' scopes users, engagement, tokens and guests", async (segment, mode, ids) => {
    const result = await computeDashboardMetrics('month', segment)

    const cohort = agg.aggregateUsers.mock.calls[0][2] as {
      segment: string
      mode: string
      stringIds: string[]
    }
    expect(cohort).toMatchObject({ segment, mode, stringIds: ids })
    expect(agg.aggregateUserStats).toHaveBeenCalledTimes(1)
    expect(agg.aggregateUserStats.mock.calls[0][3]).toBe(cohort)
    expect(agg.aggregateSignupSources.mock.calls[0][2]).toBe(cohort)
    expect(agg.aggregateMonthlySignups.mock.calls[0][1]).toBe(cohort)
    expect(agg.aggregateTokenMetrics.mock.calls[0][2]).toBe(cohort)
    expect(agg.aggregateGuestSessions.mock.calls[0][3]).toBe(cohort)
    expect(aggregateGuestInsights.mock.calls[0][3]).toBe(cohort)
    expect(result.userMetrics).toEqual({ statsFrom: 'cohort' })
    expect(result.engagement.avgTimeSpentMinutes).toBe(99)
    expect(result.segment).toBe(segment)
  })

  it('attaches b2bMetrics only for b2b', async () => {
    expect((await computeDashboardMetrics('week', 'b2b')).b2bMetrics).toEqual({ schools: 1 })
    expect(await computeDashboardMetrics('week', 'b2c')).not.toHaveProperty('b2bMetrics')
  })
})
