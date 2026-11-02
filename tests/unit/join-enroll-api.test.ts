import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getWebUser, enrollStudentInClass } = vi.hoisted(() => ({
  getWebUser: vi.fn(),
  enrollStudentInClass: vi.fn(),
}))

vi.mock('@/infra/web-api/mongo-payload', () => ({ getWebUser }))
vi.mock('@/server/services/classroom/class-enrollment', () => ({ enrollStudentInClass }))

import { POST } from '@/app/api/join/enroll/route'

const CLASS_ID = '64b7f0c2a1b2c3d4e5f60718'
const PROFILE = { firstName: 'נועה', lastName: 'כהן', phone: '0501234567' }
const VALID_BODY = { classId: CLASS_ID, profile: PROFILE }

function request(body: unknown) {
  return new NextRequest('https://aguy.co.il/api/join/enroll', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-request-id': 'join-enroll-test' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/join/enroll', () => {
  beforeEach(() => {
    getWebUser.mockReset()
    enrollStudentInClass.mockReset()
  })

  it('asks signed-out visitors to sign in', async () => {
    getWebUser.mockResolvedValue(null)

    const response = await POST(request(VALID_BODY))

    expect(response.status).toBe(401)
    expect(enrollStudentInClass).not.toHaveBeenCalled()
  })

  it.each([
    {},
    { classId: '' },
    'not json',
    { classId: CLASS_ID },
    { classId: CLASS_ID, profile: { ...PROFILE, firstName: '  ' } },
    { classId: CLASS_ID, profile: { ...PROFILE, lastName: 'x'.repeat(51) } },
    { classId: CLASS_ID, profile: { ...PROFILE, phone: '0312345678' } },
    { classId: CLASS_ID, profile: { ...PROFILE, phone: '05012345' } },
  ])('rejects a malformed body %#', async (body) => {
    getWebUser.mockResolvedValue({ id: 'user-1', role: 'student' })

    const response = await POST(request(body))

    expect(response.status).toBe(400)
    expect(enrollStudentInClass).not.toHaveBeenCalled()
  })

  it('returns 404 when the class has no course to land on', async () => {
    getWebUser.mockResolvedValue({ id: 'user-1', role: 'student' })
    enrollStudentInClass.mockResolvedValue({ status: 'not_found' })

    const response = await POST(request(VALID_BODY))

    expect(response.status).toBe(404)
  })

  it('enrolls the signed-in user and returns the course page', async () => {
    getWebUser.mockResolvedValue({ id: 'user-1', role: 'student' })
    enrollStudentInClass.mockResolvedValue({ status: 'enrolled', courseSlug: 'math-9' })

    const response = await POST(request(VALID_BODY))

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ courseHref: '/courses/math-9' })
    expect(enrollStudentInClass).toHaveBeenCalledWith('user-1', CLASS_ID, PROFILE)
  })

  it('trims names and strips phone formatting before enrolling', async () => {
    getWebUser.mockResolvedValue({ id: 'user-1', role: 'student' })
    enrollStudentInClass.mockResolvedValue({ status: 'enrolled', courseSlug: 'math-9' })

    const profile = { firstName: ' נועה ', lastName: 'כהן ', phone: '050-123 4567' }
    const response = await POST(request({ classId: CLASS_ID, profile }))

    expect(response.status).toBe(200)
    expect(enrollStudentInClass).toHaveBeenCalledWith('user-1', CLASS_ID, PROFILE)
  })

  it('returns 500 when enrollment throws', async () => {
    getWebUser.mockResolvedValue({ id: 'user-1', role: 'student' })
    enrollStudentInClass.mockRejectedValue(new Error('db down'))

    const response = await POST(request(VALID_BODY))

    expect(response.status).toBe(500)
  })
})
