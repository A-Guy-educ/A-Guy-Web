import { describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'

import { fetchAdminUserRefs } from '@/server/services/dashboard/admin-users'

function fakeDb(rows: Array<{ _id: unknown }>) {
  return {
    collection: vi.fn(() => ({
      find: vi.fn(() => ({
        toArray: vi.fn(async () => rows),
      })),
    })),
  }
}

describe('fetchAdminUserRefs', () => {
  it('returns empty refs when there are no admins', async () => {
    const db = fakeDb([])

    const result = await fetchAdminUserRefs(db as never)

    expect(result.refs).toEqual([])
    expect(result.stringIds).toEqual([])
  })

  it('returns each ObjectId in both encoded forms so $nin matches either', async () => {
    // The user relationship is dual-encoded across our history (see
    // progress.ts userFilter). Both shapes must land in refs for $nin
    // filters against user-stats/enrollments/transactions to be tight.
    const oid = new ObjectId('507f1f77bcf86cd799439011')
    const db = fakeDb([{ _id: oid }])

    const result = await fetchAdminUserRefs(db as never)

    expect(result.refs).toEqual([oid, '507f1f77bcf86cd799439011'])
    expect(result.stringIds).toEqual(['507f1f77bcf86cd799439011'])
  })

  it('coerces string _ids into ObjectIds so downstream $nin still matches BSON-encoded rows', async () => {
    // A user doc could arrive with `_id` already stringified (older writes,
    // fixtures). Refs still need to carry both forms so pipelines that
    // stored the reference as an ObjectId aren't accidentally admitted.
    const db = fakeDb([{ _id: '507f1f77bcf86cd799439011' }])

    const result = await fetchAdminUserRefs(db as never)

    expect(result.refs).toHaveLength(2)
    expect(result.refs[0]).toBeInstanceOf(ObjectId)
    expect(String(result.refs[0])).toBe('507f1f77bcf86cd799439011')
    expect(result.refs[1]).toBe('507f1f77bcf86cd799439011')
    expect(result.stringIds).toEqual(['507f1f77bcf86cd799439011'])
  })

  it('passes through non-ObjectId string _ids as-is', async () => {
    // Junk ids do exist in older data. Emitting them into refs still
    // filters those rows, and skipping the ObjectId form avoids a throw.
    const db = fakeDb([{ _id: 'legacy-string-id' }])

    const result = await fetchAdminUserRefs(db as never)

    expect(result.refs).toEqual(['legacy-string-id'])
    expect(result.stringIds).toEqual(['legacy-string-id'])
  })

  it('queries the users collection with a role=admin filter', async () => {
    const find = vi.fn(() => ({ toArray: vi.fn(async () => []) }))
    const collection = vi.fn(() => ({ find }))
    const db = { collection } as never

    await fetchAdminUserRefs(db)

    expect(collection).toHaveBeenCalledWith('users')
    expect(find).toHaveBeenCalledWith({ role: 'admin' }, { projection: { _id: 1 } })
  })
})
