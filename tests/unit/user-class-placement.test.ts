import { ObjectId } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { collections } = vi.hoisted(() => ({
  collections: new Map<string, Record<string, ReturnType<typeof vi.fn>>>(),
}))

vi.mock('@/infra/db/content-db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/infra/db/content-db')>()),
  getContentDb: async () => ({ collection: (name: string) => collections.get(name) }),
}))

import { getUserClassPlacement } from '@/server/services/classroom/user-class-placement'

const SCHOOL_A = new ObjectId()
const SCHOOL_B = new ObjectId()
const USER_ID = new ObjectId().toString()

function findReturning(docs: unknown[]) {
  return vi.fn(() => ({ toArray: async () => docs }))
}

describe('getUserClassPlacement', () => {
  let schoolsFind: ReturnType<typeof vi.fn>

  beforeEach(() => {
    schoolsFind = findReturning([{ _id: SCHOOL_A, name: 'תיכון אלון' }])
    collections.set('schools', { find: schoolsFind })
  })

  it('returns blanks without querying schools for a user on no roster', async () => {
    collections.set('classes', { find: findReturning([]) })

    expect(await getUserClassPlacement(USER_ID)).toEqual({ className: null, schoolName: null })
    expect(schoolsFind).not.toHaveBeenCalled()
  })

  it('resolves the class and school, with the relation stored as a string', async () => {
    collections.set('classes', {
      find: findReturning([{ name: 'ט׳2', school: SCHOOL_A.toString() }]),
    })

    expect(await getUserClassPlacement(USER_ID)).toEqual({
      className: 'ט׳2',
      schoolName: 'תיכון אלון',
    })
  })

  it('matches the user in both id encodings on either roster', async () => {
    const classesFind = findReturning([])
    collections.set('classes', { find: classesFind })

    await getUserClassPlacement(USER_ID)

    const refs = [USER_ID, new ObjectId(USER_ID)]
    expect(classesFind.mock.calls[0][0]).toEqual({
      $or: [{ students: { $in: refs } }, { teachers: { $in: refs } }],
    })
  })

  it('lists every class but repeats a shared school once', async () => {
    collections.set('classes', {
      find: findReturning([
        { name: 'ט׳1', school: SCHOOL_A },
        { name: 'ט׳2', school: SCHOOL_A },
      ]),
    })

    expect(await getUserClassPlacement(USER_ID)).toEqual({
      className: 'ט׳1, ט׳2',
      schoolName: 'תיכון אלון',
    })
  })

  it('leaves the school blank when the class points at a deleted school', async () => {
    schoolsFind = findReturning([])
    collections.set('schools', { find: schoolsFind })
    collections.set('classes', { find: findReturning([{ name: 'ט׳1', school: SCHOOL_B }]) })

    expect(await getUserClassPlacement(USER_ID)).toEqual({
      className: 'ט׳1',
      schoolName: null,
    })
  })
})
