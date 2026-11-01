import { ObjectId } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { collections, queryCourseSlugById } = vi.hoisted(() => ({
  collections: new Map<string, Record<string, ReturnType<typeof vi.fn>>>(),
  queryCourseSlugById: vi.fn(),
}))

vi.mock('@/infra/db/content-db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/infra/db/content-db')>()),
  getContentDb: async () => ({ collection: (name: string) => collections.get(name) }),
}))
vi.mock('@/server/repos/queries/courses', () => ({ queryCourseSlugById }))

import {
  enrollStudentInClass,
  listJoinableSchools,
} from '@/server/services/classroom/class-enrollment'

const SCHOOL_A = new ObjectId()
const SCHOOL_B = new ObjectId()
const CLASS_ID = new ObjectId()
const COURSE_ID = new ObjectId()
const USER_ID = new ObjectId().toString()

function findReturning(docs: unknown[]) {
  return vi.fn(() => ({ toArray: async () => docs }))
}

describe('listJoinableSchools', () => {
  it('groups classes under their school and drops schools with none', async () => {
    collections.set('schools', {
      find: findReturning([
        { _id: SCHOOL_A, name: 'תיכון אלון' },
        { _id: SCHOOL_B, name: 'אורט' },
      ]),
    })
    collections.set('classes', {
      find: findReturning([
        { _id: CLASS_ID, name: 'ט׳2', school: SCHOOL_A },
        { _id: new ObjectId(), name: 'ט׳1', school: SCHOOL_A.toString() },
      ]),
    })

    const schools = await listJoinableSchools()

    expect(schools).toHaveLength(1)
    expect(schools[0]).toMatchObject({ id: SCHOOL_A.toString(), name: 'תיכון אלון' })
    expect(schools[0].classes.map((c) => c.name)).toEqual(['ט׳1', 'ט׳2'])
  })
})

describe('enrollStudentInClass', () => {
  let findOne: ReturnType<typeof vi.fn>
  let updateOne: ReturnType<typeof vi.fn>

  beforeEach(() => {
    findOne = vi.fn()
    updateOne = vi.fn()
    collections.set('classes', { findOne, updateOne })
    queryCourseSlugById.mockReset()
  })

  it('rejects ids that are not ObjectIds without touching the db', async () => {
    expect(await enrollStudentInClass(USER_ID, 'nope')).toEqual({ status: 'not_found' })
    expect(findOne).not.toHaveBeenCalled()
  })

  it('returns not_found for a missing class', async () => {
    findOne.mockResolvedValue(null)

    expect(await enrollStudentInClass(USER_ID, CLASS_ID.toString())).toEqual({
      status: 'not_found',
    })
    expect(updateOne).not.toHaveBeenCalled()
  })

  it('returns not_found when the course no longer resolves', async () => {
    findOne.mockResolvedValue({ _id: CLASS_ID, course: COURSE_ID })
    queryCourseSlugById.mockResolvedValue(null)

    expect(await enrollStudentInClass(USER_ID, CLASS_ID.toString())).toEqual({
      status: 'not_found',
    })
    expect(updateOne).not.toHaveBeenCalled()
  })

  it('adds the student once and returns the course slug', async () => {
    findOne.mockResolvedValue({ _id: CLASS_ID, course: COURSE_ID })
    queryCourseSlugById.mockResolvedValue('math-9')

    const result = await enrollStudentInClass(USER_ID, CLASS_ID.toString())

    expect(result).toEqual({ status: 'enrolled', courseSlug: 'math-9' })
    expect(queryCourseSlugById).toHaveBeenCalledWith(COURSE_ID.toString())
    const [filter, update] = updateOne.mock.calls[0]
    expect(filter._id).toEqual(CLASS_ID)
    expect(filter.students.$nin).toEqual([USER_ID, new ObjectId(USER_ID)])
    expect(update).toEqual({ $push: { students: new ObjectId(USER_ID) } })
  })
})
