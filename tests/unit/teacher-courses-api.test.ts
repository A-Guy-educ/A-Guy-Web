import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getWebUser, listManagedCourses } = vi.hoisted(() => ({
  getWebUser: vi.fn(),
  listManagedCourses: vi.fn(),
}))

vi.mock('@/infra/web-api/mongo-payload', () => ({ getWebUser }))
vi.mock('@/server/services/course-management-service', () => ({ listManagedCourses }))

import { GET } from '@/app/api/teacher/courses/route'

function request() {
  return new NextRequest('https://api.aguy.co.il/api/teacher/courses', {
    headers: { 'x-request-id': 'teacher-courses-test' },
  })
}

describe('GET /api/teacher/courses', () => {
  beforeEach(() => {
    getWebUser.mockReset()
    listManagedCourses.mockReset()
  })

  it('rejects anonymous users', async () => {
    getWebUser.mockResolvedValue(null)

    const response = await GET(request())

    expect(response.status).toBe(401)
    expect(listManagedCourses).not.toHaveBeenCalled()
  })

  it('rejects students', async () => {
    getWebUser.mockResolvedValue({ id: 'student-1', role: 'student' })

    const response = await GET(request())

    expect(response.status).toBe(403)
    expect(listManagedCourses).not.toHaveBeenCalled()
  })

  it.each(['admin', 'advanced-content-editor'])('allows %s users', async (role) => {
    getWebUser.mockResolvedValue({ id: 'editor-1', role })
    listManagedCourses.mockResolvedValue([
      {
        id: 'course-1',
        title: 'Algebra',
        slug: 'algebra',
        status: 'draft',
        isActive: true,
        locale: 'en',
      },
    ])

    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('x-request-id')).toBe('teacher-courses-test')
    expect(await response.json()).toEqual({
      docs: [
        {
          id: 'course-1',
          title: 'Algebra',
          slug: 'algebra',
          status: 'draft',
          isActive: true,
          locale: 'en',
        },
      ],
    })
  })
})
