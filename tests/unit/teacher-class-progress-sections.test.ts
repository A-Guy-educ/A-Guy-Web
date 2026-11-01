import { NextRequest } from 'next/server'
import { ObjectId } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getWebUser, collections, lessons, exercises } = vi.hoisted(() => ({
  getWebUser: vi.fn(),
  collections: {} as Record<string, unknown[]>,
  lessons: [] as Array<{ id: string; title: string }>,
  exercises: [] as unknown[],
}))

vi.mock('@/infra/web-api/mongo-payload', () => ({ getWebUser }))
vi.mock('@/infra/db/content-db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/infra/db/content-db')>()
  const collection = (name: string) => {
    const docs = collections[name] ?? []
    const cursor = { sort: () => cursor, toArray: async () => docs }
    return { findOne: async () => docs[0] ?? null, find: () => cursor }
  }
  return { ...actual, getContentDb: async () => ({ collection }) }
})
vi.mock('@/server/repos/queries/lessons', () => ({
  queryLessonsByCourse: async () => lessons,
}))
vi.mock('@/server/repos/mongo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/repos/mongo')>()
  return { ...actual, aggregateManySerialized: async () => exercises }
})

import { GET as classProgress } from '@/app/api/teacher/classes/[id]/progress/route'

const CLASS_ID = '64d000000000000000000001'
const TEACHER = '64d0000000000000000000aa'
const TENANT = '64d0000000000000000000ff'
const COURSE = '64d000000000000000000c01'
const LESSON = '64d000000000000000000101'
const STUDENT = '64d000000000000000000501'
const EX1 = '64d000000000000000000e01'
const EX2 = '64d000000000000000000e02'

const question = (id: string) => ({ id, type: 'question_free_response' })
const text = (id: string) => ({ id, type: 'rich_text' })

function attempt(exercise: string, block: string, fields: Record<string, unknown>) {
  return {
    user: new ObjectId(STUDENT),
    lesson: new ObjectId(LESSON),
    exercise: new ObjectId(exercise),
    block,
    solved: false,
    wrongCount: 0,
    hintCount: 0,
    explanationCount: 0,
    ...fields,
  }
}

describe('GET /api/teacher/classes/:id/progress sections', () => {
  beforeEach(() => {
    getWebUser.mockResolvedValue({ id: TEACHER, role: 'teacher', tenant: TENANT })
    lessons.splice(0, lessons.length, { id: LESSON, title: 'Lesson 1' })
    // Returned out of order: the endpoint must sort by exercise `order`.
    exercises.splice(
      0,
      exercises.length,
      {
        id: EX2,
        lesson: LESSON,
        order: 2,
        sections: [
          { id: 'b0', order: 0, content: { blocks: [question('q-d')] } },
          { id: 'b1', order: 1, content: { blocks: [question('q-e')] } },
          { id: 'b2', order: 2, content: { blocks: [question('q-f')] } },
        ],
      },
      {
        id: EX1,
        lesson: LESSON,
        order: 1,
        // Display-only top-level group → not a counted section.
        content: { blocks: [text('intro')] },
        sections: [
          { id: 'a0', order: 0, content: { blocks: [question('q-a')] } },
          { id: 'a1', order: 1, content: { blocks: [text('note')] } },
          { id: 'a2', order: 2, content: { blocks: [question('q-c')] } },
          { id: 'a3', order: 3, content: { blocks: [question('q-g')] } },
        ],
      },
    )
    collections.classes = [
      {
        _id: new ObjectId(CLASS_ID),
        name: '7A',
        course: new ObjectId(COURSE),
        teachers: [new ObjectId(TEACHER)],
        students: [new ObjectId(STUDENT)],
        tenant: new ObjectId(TENANT),
      },
    ]
    collections.users = [{ _id: new ObjectId(STUDENT), name: 'Noa' }]
    collections['user-progresses'] = []
    collections['question-attempts'] = [
      attempt(EX1, 'q-a', { solved: true, explanationCount: 1 }),
      attempt(EX1, 'q-c', { wrongCount: 2 }),
      attempt(EX1, 'q-g', { solved: true, selfChecked: true }),
      // q-d has no attempt doc.
      attempt(EX2, 'q-e', { solved: true }),
      // Hint tapped but never answered.
      attempt(EX2, 'q-f', { hintCount: 1 }),
    ]
  })

  it('returns one outcome per counted section, in lesson order', async () => {
    const res = await classProgress(
      new NextRequest(`https://api.aguy.co.il/api/teacher/classes/${CLASS_ID}/progress`),
      { params: Promise.resolve({ id: CLASS_ID }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.students[0].lessons[LESSON].sections).toEqual([
      { id: `${EX1}:1`, outcome: 'with-help' },
      { id: `${EX1}:2`, outcome: 'alone' },
      { id: `${EX1}:3`, outcome: 'wrong' },
      { id: `${EX1}:4`, outcome: 'with-help' },
      { id: `${EX2}:0`, outcome: 'skipped' },
      { id: `${EX2}:1`, outcome: 'alone' },
      { id: `${EX2}:2`, outcome: 'skipped' },
    ])
  })
})
