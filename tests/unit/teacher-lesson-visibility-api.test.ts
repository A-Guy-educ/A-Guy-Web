import { NextRequest } from 'next/server'
import { ObjectId } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getWebUser, findOne, updateOne, queryLessonsByCourse } = vi.hoisted(() => ({
  getWebUser: vi.fn(),
  findOne: vi.fn(),
  updateOne: vi.fn(),
  queryLessonsByCourse: vi.fn(),
}))

vi.mock('@/infra/web-api/mongo-payload', () => ({ getWebUser }))
vi.mock('@/server/repos/queries/lessons', () => ({ queryLessonsByCourse }))
vi.mock('@/infra/db/content-db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/infra/db/content-db')>()
  return { ...actual, getContentDb: async () => ({ collection: () => ({ findOne, updateOne }) }) }
})

import { PATCH } from '@/app/api/teacher/classes/[id]/lessons/[lessonId]/route'

const CLASS_ID = '64c000000000000000000001'
const COURSE = '64c0000000000000000000cc'
const LESSON = '64c000000000000000000011'
const OTHER_LESSON = '64c000000000000000000099'
const TEACHER = '64c0000000000000000000aa'

function patch(body: unknown, lessonId = LESSON) {
  const request = new NextRequest(
    `https://api.aguy.co.il/api/teacher/classes/${CLASS_ID}/lessons/${lessonId}`,
    { method: 'PATCH', body: typeof body === 'string' ? body : JSON.stringify(body) },
  )
  return PATCH(request, { params: Promise.resolve({ id: CLASS_ID, lessonId }) })
}

describe('PATCH /api/teacher/classes/:id/lessons/:lessonId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getWebUser.mockResolvedValue({ id: TEACHER, role: 'teacher' })
    findOne.mockResolvedValue({
      _id: new ObjectId(CLASS_ID),
      teachers: [new ObjectId(TEACHER)],
      course: new ObjectId(COURSE),
    })
    queryLessonsByCourse.mockResolvedValue([{ id: LESSON }])
  })

  it('401s without a session and 403s a student', async () => {
    getWebUser.mockResolvedValueOnce(null)
    expect((await patch({ hidden: true })).status).toBe(401)

    getWebUser.mockResolvedValueOnce({ id: TEACHER, role: 'student' })
    expect((await patch({ hidden: true })).status).toBe(403)
    expect(updateOne).not.toHaveBeenCalled()
  })

  it.each([{}, { hidden: 'yes' }, 'not json'])('400s a bad body: %j', async (body) => {
    expect((await patch(body)).status).toBe(400)
    expect(updateOne).not.toHaveBeenCalled()
  })

  it("404s another teacher's class", async () => {
    getWebUser.mockResolvedValue({ id: '64c0000000000000000000bb', role: 'teacher' })
    expect((await patch({ hidden: true })).status).toBe(404)
    expect(updateOne).not.toHaveBeenCalled()
  })

  it("404s a lesson outside the class's course", async () => {
    expect((await patch({ hidden: true }, OTHER_LESSON)).status).toBe(404)
    expect(updateOne).not.toHaveBeenCalled()
  })

  it('hides with $addToSet', async () => {
    const response = await patch({ hidden: true })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ lessonId: LESSON, hidden: true })
    expect(updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(CLASS_ID) },
      { $addToSet: { hiddenLessons: new ObjectId(LESSON) } },
    )
  })

  it('shows with $pull in both id encodings', async () => {
    expect((await patch({ hidden: false })).status).toBe(200)
    expect(updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(CLASS_ID) },
      { $pull: { hiddenLessons: { $in: [LESSON, new ObjectId(LESSON)] } } },
    )
  })
})
