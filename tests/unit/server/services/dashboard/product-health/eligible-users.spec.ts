import type { Db } from 'mongodb'
import { describe, expect, it, vi } from 'vitest'

import { fetchEligibleUsers } from '@/server/services/dashboard/product-health/eligible-users'
import type { UserCohort } from '@/server/services/dashboard/user-segment'

const span = { start: new Date('2026-11-01'), end: new Date('2026-11-15') }

function mockDb() {
  const find = vi.fn(() => ({ toArray: async () => [] }))
  const db = { collection: vi.fn(() => ({ find })) } as unknown as Db
  return { db, find }
}

function matchOf(find: ReturnType<typeof mockDb>['find']): Record<string, unknown> {
  return (find.mock.calls[0] as unknown as [Record<string, unknown>])[0]
}

describe('fetchEligibleUsers — segment cohort', () => {
  it('leaves _id unfiltered without a cohort', async () => {
    const { db, find } = mockDb()
    await fetchEligibleUsers(db, span, { courseId: null, grade: null })
    expect(matchOf(find)).not.toHaveProperty('_id')
  })

  it.each([
    ['b2b', 'in', '$in'],
    ['b2c', 'nin', '$nin'],
  ] as const)("restricts the pool to a '%s' cohort", async (segment, mode, op) => {
    const { db, find } = mockDb()
    const cohort: UserCohort = { segment, mode, refs: ['u1'], stringIds: ['u1'] }
    await fetchEligibleUsers(db, span, { courseId: null, grade: null, cohort })
    expect(matchOf(find)).toMatchObject({ role: { $ne: 'admin' }, _id: { [op]: ['u1'] } })
  })
})
