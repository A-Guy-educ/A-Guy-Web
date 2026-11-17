import { ObjectId } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { find, getMeUser } = vi.hoisted(() => ({ find: vi.fn(), getMeUser: vi.fn() }))

vi.mock('@/infra/db/content-db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/infra/db/content-db')>()),
  getContentDb: async () => ({ collection: () => ({ find }) }),
}))
vi.mock('@/infra/utils/getMeUser', () => ({ getMeUser }))

import { withoutTeacherHiddenLessons } from '@/app/(frontend)/study/withoutTeacherHiddenLessons'
import type { PrefetchedStudyData } from '@/server/repos/queries/study-page'
import { buildClassProgress } from '@/server/services/teacher-dashboard/class-progress-shape'
import {
  getHiddenLessonIdsForStudent,
  hiddenInEveryClass,
  withoutHiddenLessons,
} from '@/server/services/classroom/class-lesson-visibility'

const STUDENT = '64c0000000000000000000aa'
const COURSE = '64c0000000000000000000cc'
const L1 = '64c000000000000000000011'
const L2 = '64c000000000000000000022'

function classesReturning(docs: unknown[]) {
  find.mockReturnValue({ toArray: async () => docs })
}

describe('hiddenInEveryClass', () => {
  it('hides nothing without classes', () => {
    expect([...hiddenInEveryClass([])]).toEqual([])
  })

  it('reads ObjectId and string ids alike', () => {
    expect([...hiddenInEveryClass([{ hiddenLessons: [new ObjectId(L1), L2] }])]).toEqual([L1, L2])
  })

  it('keeps a lesson hidden only when every class hides it', () => {
    const hidden = hiddenInEveryClass([{ hiddenLessons: [L1, L2] }, { hiddenLessons: [L2] }])
    expect([...hidden]).toEqual([L2])
  })

  it('treats a class with no list as showing everything', () => {
    expect([...hiddenInEveryClass([{ hiddenLessons: [L1] }, {}])]).toEqual([])
  })
})

describe('getHiddenLessonIdsForStudent', () => {
  beforeEach(() => find.mockReset())

  it('skips the lookup for signed-out users and missing courses', async () => {
    expect((await getHiddenLessonIdsForStudent(null, COURSE)).size).toBe(0)
    expect((await getHiddenLessonIdsForStudent({ id: STUDENT, role: 'student' }, null)).size).toBe(
      0,
    )
    expect(find).not.toHaveBeenCalled()
  })

  it.each(['teacher', 'admin'])('never hides lessons from a %s', async (role) => {
    expect((await getHiddenLessonIdsForStudent({ id: STUDENT, role }, COURSE)).size).toBe(0)
    expect(find).not.toHaveBeenCalled()
  })

  it("looks up the student's classes on this course in both id encodings", async () => {
    classesReturning([{ hiddenLessons: [new ObjectId(L1)] }])

    const hidden = await getHiddenLessonIdsForStudent({ id: STUDENT, role: 'student' }, COURSE)

    expect([...hidden]).toEqual([L1])
    expect(find.mock.calls[0][0]).toEqual({
      students: { $in: [STUDENT, new ObjectId(STUDENT)] },
      course: { $in: [COURSE, new ObjectId(COURSE)] },
    })
  })
})

describe('withoutTeacherHiddenLessons', () => {
  const data = {
    courseId: COURSE,
    chapters: [
      { id: 'c1', lessons: [{ id: L1 }, { id: L2 }] },
      { id: 'c2', lessons: [{ id: L2 }] },
      { id: 'c3', lessons: [] },
    ],
  } as unknown as PrefetchedStudyData

  beforeEach(() => {
    find.mockReset()
    getMeUser.mockResolvedValue({ user: { id: STUDENT, role: 'student' } })
  })

  it('returns the shared data untouched when nothing is hidden', async () => {
    classesReturning([])
    expect(await withoutTeacherHiddenLessons(data)).toBe(data)
  })

  it('drops hidden lessons and chapters emptied by hiding, keeping already-empty ones', async () => {
    classesReturning([{ hiddenLessons: [L2] }])

    const result = await withoutTeacherHiddenLessons(data)

    expect(result?.chapters).toEqual([
      { id: 'c1', lessons: [{ id: L1 }] },
      { id: 'c3', lessons: [] },
    ])
    expect(data.chapters[0].lessons).toHaveLength(2)
  })
})

describe('class progress hiddenLessonIds', () => {
  it("keeps only ids of the course's current lessons", () => {
    const progress = buildClassProgress({
      classId: 'class',
      className: 'ט׳2',
      lessons: [{ id: L1, title: 'A', questions: [] }],
      students: [],
      progressDocs: [],
      attempts: [],
      hiddenLessonIds: [L1, 'removed-lesson'],
    })
    expect(progress.hiddenLessonIds).toEqual([L1])
  })
})

describe('withoutHiddenLessons', () => {
  it('drops hidden lessons and keeps order', () => {
    const lessons = [{ id: L1 }, { id: L2 }, { id: 'x' }]
    expect(withoutHiddenLessons(lessons, new Set([L2]))).toEqual([{ id: L1 }, { id: 'x' }])
  })
})
