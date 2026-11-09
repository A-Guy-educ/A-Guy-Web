import { NextRequest } from 'next/server'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetWebUser = vi.hoisted(() => vi.fn())
const mockRun = vi.hoisted(() => vi.fn())

vi.mock('@/infra/web-api/mongo-payload', () => ({ getWebUser: mockGetWebUser }))
vi.mock('@/server/services/notebook-check/notebook-check', () => ({ runNotebookCheck: mockRun }))

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAA'
const body = { inkImage: PNG, contextKey: 'lessons:lesson-1', locale: 'he' }

async function post(payload: unknown) {
  const { POST } = await import('@/app/api/notebook/check/route')
  const response = await POST(
    new NextRequest('http://localhost/api/notebook/check', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
    }),
  )
  return { status: response.status, body: await response.json() }
}

// The route's first load takes seconds, too close to the per-test timeout.
beforeAll(async () => {
  await import('@/app/api/notebook/check/route')
}, 30_000)

beforeEach(() => {
  mockGetWebUser.mockReset().mockResolvedValue({ id: 'student-1', role: 'student' })
  mockRun.mockReset().mockResolvedValue({ message: 'ok', conversationId: 'c', contextKey: 'k' })
})

describe('POST /api/notebook/check', () => {
  it('refuses anonymous callers', async () => {
    mockGetWebUser.mockResolvedValue(null)

    expect((await post(body)).status).toBe(401)
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('rejects handwriting that is not a PNG data URL', async () => {
    expect((await post({ ...body, inkImage: 'data:text/html;base64,PGh0bWw+' })).status).toBe(400)
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('passes the decoded image to the check', async () => {
    const { status } = await post(body)

    expect(status).toBe(200)
    expect(mockRun.mock.calls[0][0]).toMatchObject({
      ownerId: 'student-1',
      inkBase64: 'iVBORw0KGgoAAAA',
    })
  })
})
