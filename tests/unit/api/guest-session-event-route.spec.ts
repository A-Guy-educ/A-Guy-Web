/**
 * POST /api/guest-session/event — the beacon is keyed only by the httpOnly
 * guest cookie. A session id in the body must never be honoured, and
 * requests without a valid cookie must not reach the writer.
 */

import { NextRequest } from 'next/server'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mockRecordGuestSessionEvent = vi.hoisted(() => vi.fn())

vi.mock('@/server/services/guest-sessions/guest-session-events', () => ({
  recordGuestSessionEvent: mockRecordGuestSessionEvent,
}))

const COOKIE_ID = '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e'
const FORGED_ID = '11111111-2222-4333-8444-555555555555'

async function post(body: unknown, cookie?: string) {
  const { POST } = await import('@/app/api/guest-session/event/route')
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (cookie) headers.cookie = `guest_session_id=${cookie}`
  const request = new NextRequest('https://www.aguy.co.il/api/guest-session/event', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
  const response = await POST(request)
  return { status: response.status, body: await response.json() }
}

describe('POST /api/guest-session/event', () => {
  // Cold-import of the route pulls in the Next runtime; warm it once so the
  // first test doesn't trip the default 5s timeout.
  beforeAll(async () => {
    await import('@/app/api/guest-session/event/route')
  }, 60_000)

  beforeEach(() => {
    mockRecordGuestSessionEvent.mockReset()
    mockRecordGuestSessionEvent.mockResolvedValue(true)
  })

  it('ignores requests without a guest cookie', async () => {
    const res = await post({ event: 'js_confirmed' })
    expect(res).toEqual({ status: 200, body: { recorded: false } })
    expect(mockRecordGuestSessionEvent).not.toHaveBeenCalled()
  })

  it('ignores a cookie we could not have written', async () => {
    const res = await post({ event: 'js_confirmed' }, 'not-a-uuid')
    expect(res.body).toEqual({ recorded: false })
    expect(mockRecordGuestSessionEvent).not.toHaveBeenCalled()
  })

  it('writes against the cookie session, never a body-supplied id', async () => {
    const res = await post(
      { event: 'onboarding', step: 'personaSelected', sessionId: FORGED_ID },
      COOKIE_ID,
    )
    expect(res.body).toEqual({ recorded: true })
    expect(mockRecordGuestSessionEvent).toHaveBeenCalledWith(COOKIE_ID, {
      event: 'onboarding',
      step: 'personaSelected',
    })
  })

  it('passes the content trigger through', async () => {
    await post(
      { event: 'onboarding', step: 'signupPromptShown', trigger: { type: 'lesson', id: 'l1' } },
      COOKIE_ID,
    )
    expect(mockRecordGuestSessionEvent).toHaveBeenCalledWith(COOKIE_ID, {
      event: 'onboarding',
      step: 'signupPromptShown',
      trigger: { type: 'lesson', id: 'l1' },
    })
  })

  it('reports recorded=false for an unknown session so the client can retry', async () => {
    mockRecordGuestSessionEvent.mockResolvedValue(false)
    const res = await post({ event: 'js_confirmed' }, COOKIE_ID)
    expect(res.body).toEqual({ recorded: false })
  })

  it.each([
    [{ event: 'onboarding', step: 'completed' }],
    [{ event: 'onboarding', step: 'started', trigger: { type: 'post', id: 'x' } }],
    [{ event: 'something-else' }],
    ['not json'],
  ])('rejects invalid bodies with 400: %j', async (body) => {
    const res = await post(body, COOKIE_ID)
    expect(res.status).toBe(400)
    expect(mockRecordGuestSessionEvent).not.toHaveBeenCalled()
  })
})
