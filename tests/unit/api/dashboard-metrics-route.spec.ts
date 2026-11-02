/**
 * Period-handling tests for GET /api/dashboard-metrics.
 *
 * Locks in that the endpoint accepts every value in VALID_PERIODS (day, week,
 * month, year) and rejects anything else with 400. The Dash Users-tab picker
 * relies on all four being supported natively — the old day→month shim in
 * A-Guy-Dash exists purely because Web used to 400 on `day`.
 *
 * Also covers the B2B/B2C `segment` param: validation, the default of `all`,
 * the cohort predicates partitioning `all`, and the `b2bMetrics` shape.
 */

import { ObjectId } from 'mongodb'
import { NextRequest } from 'next/server'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildB2bMetrics } from '@/server/services/dashboard/b2b-metrics'
import {
  buildClassRoster,
  buildUserCohort,
  userRefPredicate,
  usersCohortMatch,
  type ClassDoc,
} from '@/server/services/dashboard/user-segment'

const mockGetWebUser = vi.hoisted(() => vi.fn())
const mockComputeDashboardMetrics = vi.hoisted(() => vi.fn())
const mockIsProductHealthEnabled = vi.hoisted(() => vi.fn(() => false))

vi.mock('@/infra/web-api/mongo-payload', () => ({ getWebUser: mockGetWebUser }))

vi.mock('@/server/services/dashboard/metrics-service', () => ({
  computeDashboardMetrics: mockComputeDashboardMetrics,
}))

vi.mock('@/server/services/dashboard/product-health/config', () => ({
  isProductHealthEnabled: mockIsProductHealthEnabled,
}))

const ADMIN = { id: 'admin-1', role: 'admin' }

function emptyMetrics(period: 'day' | 'week' | 'month' | 'year') {
  // Minimal shape — the route wraps it as-is; tests only assert status + period.
  return {
    period,
    userMetrics: {},
    monthlySignups: [],
    contentCounts: {},
    engagement: {},
    revenueMetrics: {},
    tokenMetrics: {},
  }
}

async function callRoute(url: string) {
  const { GET } = await import('@/app/api/dashboard-metrics/route')
  const response = await GET(new NextRequest(url))
  return { status: response.status, body: await response.json() }
}

describe('GET /api/dashboard-metrics — period handling', () => {
  // Cold-import of the route pulls in Next runtime, Payload types and the
  // metrics-service module tree; that's slower than the default 5s test
  // budget on the first test. Warm it up once so every it() starts hot.
  beforeAll(async () => {
    await import('@/app/api/dashboard-metrics/route')
  }, 30000)

  beforeEach(() => {
    mockGetWebUser.mockReset().mockResolvedValue(ADMIN)
    mockComputeDashboardMetrics
      .mockReset()
      .mockImplementation(async (period: 'day' | 'week' | 'month' | 'year', segment = 'all') => ({
        ...emptyMetrics(period),
        segment,
      }))
    mockIsProductHealthEnabled.mockReset().mockReturnValue(false)
  })

  it("accepts period='day' and forwards it to the metrics service", async () => {
    const { status, body } = await callRoute('http://localhost/api/dashboard-metrics?period=day')

    expect(status).toBe(200)
    expect(mockComputeDashboardMetrics).toHaveBeenCalledWith('day', 'all')
    expect(body.period).toBe('day')
  })

  it("accepts period='week'", async () => {
    const { status } = await callRoute('http://localhost/api/dashboard-metrics?period=week')
    expect(status).toBe(200)
    expect(mockComputeDashboardMetrics).toHaveBeenCalledWith('week', 'all')
  })

  it("accepts period='month'", async () => {
    const { status } = await callRoute('http://localhost/api/dashboard-metrics?period=month')
    expect(status).toBe(200)
    expect(mockComputeDashboardMetrics).toHaveBeenCalledWith('month', 'all')
  })

  it("accepts period='year'", async () => {
    const { status } = await callRoute('http://localhost/api/dashboard-metrics?period=year')
    expect(status).toBe(200)
    expect(mockComputeDashboardMetrics).toHaveBeenCalledWith('year', 'all')
  })

  it("defaults to 'month' when period is omitted", async () => {
    const { status } = await callRoute('http://localhost/api/dashboard-metrics')
    expect(status).toBe(200)
    expect(mockComputeDashboardMetrics).toHaveBeenCalledWith('month', 'all')
  })

  it('rejects an unknown period with 400', async () => {
    const { status, body } = await callRoute('http://localhost/api/dashboard-metrics?period=decade')
    expect(status).toBe(400)
    expect(body.error).toBe('Invalid period')
    expect(mockComputeDashboardMetrics).not.toHaveBeenCalled()
  })

  it('returns 401 for an anonymous caller', async () => {
    mockGetWebUser.mockResolvedValue(null)
    const { status } = await callRoute('http://localhost/api/dashboard-metrics?period=day')
    expect(status).toBe(401)
    expect(mockComputeDashboardMetrics).not.toHaveBeenCalled()
  })

  it('returns 403 for a non-admin caller', async () => {
    mockGetWebUser.mockResolvedValue({ id: 'u-1', role: 'student' })
    const { status } = await callRoute('http://localhost/api/dashboard-metrics?period=day')
    expect(status).toBe(403)
    expect(mockComputeDashboardMetrics).not.toHaveBeenCalled()
  })
})

describe('GET /api/dashboard-metrics — segment handling', () => {
  beforeAll(async () => {
    await import('@/app/api/dashboard-metrics/route')
  }, 30000)

  beforeEach(() => {
    mockGetWebUser.mockReset().mockResolvedValue(ADMIN)
    mockComputeDashboardMetrics
      .mockReset()
      .mockImplementation(async (period: 'day' | 'week' | 'month' | 'year', segment = 'all') => ({
        ...emptyMetrics(period),
        segment,
      }))
    mockIsProductHealthEnabled.mockReset().mockReturnValue(false)
  })

  it("defaults to segment='all' and returns the service payload unchanged", async () => {
    const { status, body } = await callRoute('http://localhost/api/dashboard-metrics?period=week')
    expect(status).toBe(200)
    expect(mockComputeDashboardMetrics).toHaveBeenCalledWith('week', 'all')
    expect(body).toEqual({ ...emptyMetrics('week'), segment: 'all' })
  })

  it.each(['all', 'b2c', 'b2b'] as const)("forwards and echoes segment='%s'", async (segment) => {
    const { status, body } = await callRoute(
      `http://localhost/api/dashboard-metrics?period=month&segment=${segment}`,
    )
    expect(status).toBe(200)
    expect(mockComputeDashboardMetrics).toHaveBeenCalledWith('month', segment)
    expect(body.segment).toBe(segment)
  })

  it.each(['B2B', 'schools', ''])("rejects segment='%s' with 400", async (segment) => {
    const { status, body } = await callRoute(
      `http://localhost/api/dashboard-metrics?segment=${segment}`,
    )
    expect(status).toBe(400)
    expect(body.error).toBe('Invalid segment')
    expect(mockComputeDashboardMetrics).not.toHaveBeenCalled()
  })

  it('keeps the admin gate ahead of segment validation', async () => {
    mockGetWebUser.mockResolvedValue({ id: 'u-1', role: 'student' })
    const { status } = await callRoute('http://localhost/api/dashboard-metrics?segment=nope')
    expect(status).toBe(403)
  })

  it('sends Cache-Control: no-store for segmented responses', async () => {
    const { GET } = await import('@/app/api/dashboard-metrics/route')
    const response = await GET(
      new NextRequest('http://localhost/api/dashboard-metrics?segment=b2b'),
    )
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
})

// ---------------------------------------------------------------------------
// Cohort predicates. A minimal $in / $nin evaluator stands in for Mongo:
// like the server, it matches ObjectId and string encodings strictly by type.
// ---------------------------------------------------------------------------

function refEquals(a: unknown, b: unknown): boolean {
  if (a instanceof ObjectId && b instanceof ObjectId) return a.equals(b)
  return a === b
}

function matchesRef(value: unknown, predicate: Record<string, unknown>): boolean {
  const inList = predicate.$in as unknown[] | undefined
  const ninList = predicate.$nin as unknown[] | undefined
  if (inList && !inList.some((ref) => refEquals(ref, value))) return false
  if (ninList?.some((ref) => refEquals(ref, value))) return false
  return true
}

const oid = () => new ObjectId()

describe('dashboard user segments — B2B / B2C partition', () => {
  const studentOnly = oid()
  const teacherOnly = oid()
  const teacherAndStudent = oid()
  const consumerA = oid()
  const consumerB = oid()
  const admin = oid()
  const users = [studentOnly, teacherOnly, teacherAndStudent, consumerA, consumerB, admin]
  const adminRefs = [admin, admin.toString()]

  // Mixed encodings on purpose: /join pushes ObjectIds, older rows are strings.
  const classes: ClassDoc[] = [
    {
      _id: oid(),
      school: oid(),
      students: [studentOnly, teacherAndStudent.toString()],
      teachers: [teacherOnly.toString(), admin],
    },
    {
      _id: oid(),
      school: oid(),
      students: [studentOnly.toString()],
      teachers: [teacherAndStudent],
    },
  ]
  const roster = buildClassRoster(classes)

  // Mirrors aggregateUsers: role != admin, then the cohort clause on _id.
  function countUsers(segment: 'all' | 'b2b' | 'b2c'): number {
    const idPredicate = usersCohortMatch(buildUserCohort(segment, roster))._id as
      Record<string, unknown> | undefined
    return users.filter(
      (id) => !refEquals(id, admin) && (!idPredicate || matchesRef(id, idPredicate)),
    ).length
  }

  // Mirrors aggregateUserStats: one predicate on the `user` reference field.
  function countUserStats(segment: 'all' | 'b2b' | 'b2c', storeAsString: boolean): number {
    const predicate = userRefPredicate(adminRefs, buildUserCohort(segment, roster))
    return users.filter((id) => matchesRef(storeAsString ? id.toString() : id, predicate)).length
  }

  it("'all' adds no cohort clause, so existing pipelines are untouched", () => {
    expect(buildUserCohort('all', roster)).toBeNull()
    expect(usersCohortMatch(null)).toEqual({})
    expect(userRefPredicate(adminRefs, null)).toEqual({ $nin: adminRefs })
  })

  it('b2b + b2c users add up to all users', () => {
    expect(countUsers('all')).toBe(5)
    expect(countUsers('b2b')).toBe(3)
    expect(countUsers('b2c')).toBe(2)
    expect(countUsers('b2b') + countUsers('b2c')).toBe(countUsers('all'))
  })

  it.each([false, true])(
    'b2b + b2c user-stats rows add up to all (user stored as string: %s)',
    (storeAsString) => {
      const all = countUserStats('all', storeAsString)
      expect(all).toBe(5)
      expect(countUserStats('b2b', storeAsString) + countUserStats('b2c', storeAsString)).toBe(all)
    },
  )

  it('counts a user who teaches one class and studies in another once', () => {
    expect(roster.students.has(teacherAndStudent.toString())).toBe(true)
    expect(roster.teachers.has(teacherAndStudent.toString())).toBe(true)
    // members: studentOnly, teacherOnly, teacherAndStudent, admin
    expect(roster.members.size).toBe(4)
    expect(countUsers('b2b')).toBe(3)
  })
})

describe('buildB2bMetrics', () => {
  const schoolA = oid().toString()
  const schoolB = oid().toString()
  const [s1, s2, s3, t1, both, admin] = Array.from({ length: 6 }, () => oid().toString())

  const roster = buildClassRoster([
    { _id: oid(), school: new ObjectId(schoolA), students: [s1, s2], teachers: [t1] },
    { _id: oid(), school: schoolA, students: [s2, both], teachers: [t1, admin] },
    { _id: oid(), school: schoolB, students: [s3, admin], teachers: [both] },
  ])

  const metrics = buildB2bMetrics({
    roster,
    schoolNames: new Map([
      [schoolA, 'School A'],
      [schoolB, 'School B'],
    ]),
    activeUserIds: new Set([s2, s3, t1, admin]),
    adminUserIds: new Set([admin]),
  })

  it('returns the agreed shape with admins excluded and users deduped', () => {
    expect(metrics).toEqual({
      schools: 2,
      classes: 3,
      students: 4, // s1, s2, s3, both
      teachers: 2, // t1, both
      activeStudentsInPeriod: 2, // s2, s3 — t1 is active but not a student
      perSchool: [
        {
          schoolId: schoolA,
          schoolName: 'School A',
          classes: 2,
          students: 3,
          activeStudentsInPeriod: 1,
        },
        {
          schoolId: schoolB,
          schoolName: 'School B',
          classes: 1,
          students: 1,
          activeStudentsInPeriod: 1,
        },
      ],
    })
    expect(metrics).not.toHaveProperty('joinedInPeriod')
  })

  it('caps perSchool at the top 20 by students', () => {
    const classes = Array.from({ length: 25 }, (_, i) => ({
      _id: oid(),
      school: oid(),
      students: Array.from({ length: i + 1 }, () => oid().toString()),
    }))
    const result = buildB2bMetrics({
      roster: buildClassRoster(classes),
      schoolNames: new Map(),
      activeUserIds: new Set(),
      adminUserIds: new Set(),
    })
    expect(result.schools).toBe(25)
    expect(result.perSchool).toHaveLength(20)
    expect(result.perSchool.map((s) => s.students)).toEqual(
      Array.from({ length: 20 }, (_, i) => 25 - i),
    )
  })
})
