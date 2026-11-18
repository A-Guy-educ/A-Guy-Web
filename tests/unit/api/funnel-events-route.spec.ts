/**
 * POST /api/funnel-events — browser beacon for client-only upgrade walls.
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetWebUser = vi.hoisted(() => vi.fn())
const mockRecordFunnelEvent = vi.hoisted(() => vi.fn(async () => {}))

vi.mock('@/infra/web-api/mongo-payload', () => ({ getWebUser: mockGetWebUser }))
vi.mock('@/server/services/funnel-events', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/services/funnel-events')>()
  return { ...actual, recordFunnelEvent: mockRecordFunnelEvent }
})

import { POST } from '@/app/api/funnel-events/route'

async function post(body: unknown) {
  return POST(
    new NextRequest('http://localhost/api/funnel-events', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
  )
}

describe('POST /api/funnel-events', () => {
  beforeEach(() => {
    mockGetWebUser.mockReset()
    mockRecordFunnelEvent.mockClear()
  })

  it('rejects anonymous callers', async () => {
    mockGetWebUser.mockResolvedValue(null)
    const response = await post({ gate: 'exercise' })
    expect(response.status).toBe(401)
    expect(mockRecordFunnelEvent).not.toHaveBeenCalled()
  })

  it.each([{ gate: 'checkout' }, { gate: 'exercise', path: 'x'.repeat(301) }, null])(
    'rejects an invalid body %#',
    async (body) => {
      mockGetWebUser.mockResolvedValue({ id: 'u1' })
      const response = await post(body)
      expect(response.status).toBe(400)
      expect(mockRecordFunnelEvent).not.toHaveBeenCalled()
    },
  )

  it('records a paywall_shown event for the signed-in user', async () => {
    mockGetWebUser.mockResolvedValue({ id: 'u1' })
    const response = await post({ gate: 'ai_quota', path: '/courses/a/chapters/b/lessons/c' })
    expect(response.status).toBe(200)
    expect(mockRecordFunnelEvent).toHaveBeenCalledWith({
      type: 'paywall_shown',
      userId: 'u1',
      gate: 'ai_quota',
      path: '/courses/a/chapters/b/lessons/c',
    })
  })
})
