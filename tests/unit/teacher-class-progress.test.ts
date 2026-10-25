import { NextRequest } from 'next/server'
import { ObjectId } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getWebUser, findOne } = vi.hoisted(() => ({
  getWebUser: vi.fn(),
  findOne: vi.fn(),
}))

vi.mock('@/infra/web-api/mongo-payload', () => ({ getWebUser }))
vi.mock('@/infra/db/content-db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/infra/db/content-db')>()
  return { ...actual, getContentDb: async () => ({ collection: () => ({ findOne }) }) }
})

import { GET as listClasses } from '@/app/api/teacher/classes/route'
import { GET as classProgress } from '@/app/api/teacher/classes/[id]/progress/route'
import { buildClassProgress } from '@/server/services/teacher-dashboard/class-progress-shape'
import { canViewClass } from '@/server/services/teacher-dashboard/teacher-class-access'

const CLASS_ID = '64c000000000000000000001'
const TEACHER_A = '64c0000000000000000000aa'
const TEACHER_B = '64c0000000000000000000bb'
const TENANT = '64c0000000000000000000ff'

function request(path: string) {
  return new NextRequest(`https://api.aguy.co.il${path}`)
}

function progressFor(id = CLASS_ID) {
  return classProgress(request(`/api/teacher/classes/${id}/progress`), {
    params: Promise.resolve({ id }),
  })
}

describe('teacher dashboard authz', () => {
  beforeEach(() => {
    getWebUser.mockReset()
    findOne.mockReset()
  })

  it('401s without a session', async () => {
    getWebUser.mockResolvedValue(null)
    expect((await listClasses(request('/api/teacher/classes'))).status).toBe(401)
    expect((await progressFor()).status).toBe(401)
  })

  it.each(['student', 'advanced-content-editor'])('403s a %s', async (role) => {
    getWebUser.mockResolvedValue({ id: TEACHER_A, role })
    expect((await listClasses(request('/api/teacher/classes'))).status).toBe(403)
    expect((await progressFor()).status).toBe(403)
    expect(findOne).not.toHaveBeenCalled()
  })

  it("404s a teacher reading another teacher's class", async () => {
    getWebUser.mockResolvedValue({ id: TEACHER_B, role: 'teacher', tenant: TENANT })
    findOne.mockResolvedValue({
      _id: new ObjectId(CLASS_ID),
      name: '7A',
      teachers: [new ObjectId(TEACHER_A)],
      students: [],
      tenant: new ObjectId(TENANT),
    })
    expect((await progressFor()).status).toBe(404)
  })

  it('404s a missing class', async () => {
    getWebUser.mockResolvedValue({ id: TEACHER_A, role: 'teacher' })
    findOne.mockResolvedValue(null)
    expect((await progressFor()).status).toBe(404)
  })

  describe('canViewClass', () => {
    const classDoc = { teachers: [new ObjectId(TEACHER_A)], tenant: new ObjectId(TENANT) }

    it('allows a listed teacher in the same tenant', () => {
      expect(canViewClass({ id: TEACHER_A, role: 'teacher', tenantId: TENANT }, classDoc)).toBe(
        true,
      )
    })

    it('rejects an unlisted teacher', () => {
      expect(canViewClass({ id: TEACHER_B, role: 'teacher', tenantId: TENANT }, classDoc)).toBe(
        false,
      )
    })

    it('rejects a listed teacher from another tenant', () => {
      const other = '64c0000000000000000000ee'
      expect(canViewClass({ id: TEACHER_A, role: 'teacher', tenantId: other }, classDoc)).toBe(
        false,
      )
    })

    it('rejects a non-teacher even if listed', () => {
      expect(canViewClass({ id: TEACHER_A, role: 'student', tenantId: TENANT }, classDoc)).toBe(
        false,
      )
    })

    it('allows admins on any class', () => {
      expect(canViewClass({ id: TEACHER_B, role: 'admin', tenantId: null }, classDoc)).toBe(true)
    })
  })
})

describe('buildClassProgress', () => {
  const lessons = [
    {
      id: 'L1',
      title: 'Fractions',
      questions: [
        { exerciseId: 'E1', blockId: 'q1' },
        { exerciseId: 'E1', blockId: 'q2' },
        { exerciseId: 'E2', blockId: 'q1' },
      ],
    },
    { id: 'L2', title: 'Decimals', questions: [] },
  ]

  const result = buildClassProgress({
    classId: CLASS_ID,
    className: '7A',
    lessons,
    students: [
      { id: 'S1', name: 'Dana' },
      { id: 'S2', name: 'Noa' },
    ],
    progressDocs: [
      {
        user: 'S1',
        gradeLevel: 'default',
        progressRecords: [
          { recordType: 'lesson', recordId: 'L1', status: 'in_progress', timeSpentSeconds: 150 },
        ],
      },
      {
        user: 'S1',
        gradeLevel: 'grade-7',
        progressRecords: [{ recordType: 'lesson', recordId: 'L1', status: 'completed' }],
      },
    ],
    attempts: [
      {
        user: 'S1',
        lesson: 'L1',
        exercise: 'E1',
        block: 'q1',
        solved: true,
        wrongCount: 2,
        hintCount: 1,
      },
      { user: 'S1', lesson: 'L1', exercise: 'E1', block: 'q2', wrongCount: 1, explanationCount: 1 },
      { user: 'S2', lesson: 'L1', exercise: 'E2', block: 'q1', hintCount: 1 },
    ],
  })

  it('lists every lesson with its question count', () => {
    expect(result.lessons).toEqual([
      { id: 'L1', title: 'Fractions', questionCount: 3 },
      { id: 'L2', title: 'Decimals', questionCount: 0 },
    ])
  })

  it('merges status across buckets and takes minutes from the default bucket', () => {
    const lesson = result.students[0].lessons.L1
    expect(lesson.status).toBe('completed')
    expect(lesson.minutes).toBe(2.5)
  })

  it('reports solved / unsolved / unseen per question, including unseen ones', () => {
    expect(result.students[0].lessons.L1.questions).toEqual([
      { id: 'E1:q1', status: 'solved', mistakes: 2, hints: 1, explanations: 0 },
      { id: 'E1:q2', status: 'unsolved', mistakes: 1, hints: 0, explanations: 1 },
      { id: 'E2:q1', status: 'unseen', mistakes: 0, hints: 0, explanations: 0 },
    ])
  })

  it('omits lessons a student never started', () => {
    expect(Object.keys(result.students[0].lessons)).toEqual(['L1'])
    // S2 only has an attempt row → in_progress, no time recorded.
    expect(result.students[1].lessons.L1).toMatchObject({ status: 'in_progress', minutes: 0 })
    expect(result.students[1].lessons.L2).toBeUndefined()
  })
})
