import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { POST } from '@/app/api/learning-state/route'

const mockGetWebUser = vi.hoisted(() => vi.fn())
const mockSave = vi.hoisted(() => vi.fn())

vi.mock('@/infra/web-api/mongo-payload', () => ({ getWebUser: mockGetWebUser }))
vi.mock('@/server/services/learning-state', () => ({ saveLearningStates: mockSave }))

const WRITE = { kind: 'exercise', key: 'ex-1', state: { version: 1, answers: {} } }

const post = (body: unknown) =>
  POST(
    new NextRequest(new URL('http://example.com/api/learning-state'), {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  )

describe('POST /api/learning-state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetWebUser.mockResolvedValue({ id: 'user-a' })
    mockSave.mockResolvedValue(undefined)
  })

  it('saves the writes for the signed-in user', async () => {
    const res = await post({ ownerId: 'user-a', writes: [WRITE, { ...WRITE, state: null }] })

    expect(res.status).toBe(200)
    expect(mockSave).toHaveBeenCalledWith('user-a', [WRITE, { ...WRITE, state: null }])
  })

  it('rejects guests', async () => {
    mockGetWebUser.mockResolvedValue(null)

    const res = await post({ ownerId: 'user-a', writes: [WRITE] })

    expect(res.status).toBe(401)
    expect(mockSave).not.toHaveBeenCalled()
  })

  it("refuses a previous student's storage flushed under the new session", async () => {
    const res = await post({ ownerId: 'user-b', writes: [WRITE] })

    expect(res.status).toBe(409)
    expect(mockSave).not.toHaveBeenCalled()
  })

  it.each([
    ['unknown kind', { ownerId: 'user-a', writes: [{ ...WRITE, kind: 'notes' }] }],
    ['no writes', { ownerId: 'user-a', writes: [] }],
    ['missing owner', { writes: [WRITE] }],
    [
      'oversized state',
      { ownerId: 'user-a', writes: [{ ...WRITE, state: { blob: 'x'.repeat(100_001) } }] },
    ],
  ])('rejects %s', async (_name, body) => {
    const res = await post(body)

    expect(res.status).toBe(400)
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('returns 500 without leaking details when the save fails', async () => {
    mockSave.mockRejectedValue(new Error('mongo down'))

    const res = await post({ ownerId: 'user-a', writes: [WRITE] })

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Failed to save learning state' })
  })
})
