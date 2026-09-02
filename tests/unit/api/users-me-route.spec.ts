import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { GET } from '@/app/api/users/me/route'

const mockGetSession = vi.hoisted(() => vi.fn())

vi.mock('@/infra/auth/web-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/infra/auth/web-auth')>()
  return {
    ...actual,
    getSessionFromHeaders: mockGetSession,
  }
})

const createRequest = (cookieHeader?: string) => {
  const headers = new Headers()
  if (cookieHeader) headers.set('cookie', cookieHeader)
  return new NextRequest(new URL('http://example.com/api/users/me'), { headers })
}

const setCookieHeaders = (res: Response): string[] => {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] }
  return headers.getSetCookie ? headers.getSetCookie() : []
}

describe('GET /api/users/me', () => {
  beforeEach(() => {
    mockGetSession.mockReset()
  })

  it('returns 200 + user when the session is valid and does not touch cookies', async () => {
    const user = {
      id: 'user-1',
      email: 'student@example.com',
      role: 'student',
      collection: 'users',
    }
    mockGetSession.mockResolvedValueOnce({ token: 'valid.jwt.token', user })

    const res = await GET(createRequest('payload-token=valid.jwt.token'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ user })
    expect(setCookieHeaders(res)).toHaveLength(0)
  })

  it('clears every payload-token variant when a token is present but invalid', async () => {
    mockGetSession.mockResolvedValueOnce(null)

    const res = await GET(createRequest('payload-token=stale.invalid.token'))

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ user: null })

    const cookies = setCookieHeaders(res)
    expect(cookies.length).toBeGreaterThan(0)
    for (const cookie of cookies) {
      expect(cookie).toMatch(/^payload-token=;/)
      expect(cookie).toContain('Max-Age=0')
      expect(cookie).toContain('Path=/')
      expect(cookie).toContain('HttpOnly')
    }
  })

  it('returns 401 without any Set-Cookie when no token is present', async () => {
    mockGetSession.mockResolvedValueOnce(null)

    const res = await GET(createRequest())

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ user: null })
    expect(setCookieHeaders(res)).toHaveLength(0)
  })

  // Regression: a browser can hold more than one payload-token cookie at once
  // when scopes differ (host-only vs Domain= from a shared-login rollout, or
  // Partitioned toggled on and off). The header carries every variant. If the
  // stale one leads and we only inspect it, we mint a 401 and blanket-clear
  // the fresh cookie the user just got — the login-modal loop mobile users
  // cannot escape without a browser cookie reset.
  it('accepts a valid token even when a stale variant precedes it in the cookie header', async () => {
    const user = {
      id: 'user-1',
      email: 'student@example.com',
      role: 'student',
      collection: 'users',
    }
    // With the new iteration behaviour, the route delegates to
    // getSessionFromHeaders which tries each cookie in order; the fresh one
    // wins, so we return the same shape as a single-cookie success.
    mockGetSession.mockResolvedValueOnce({ token: 'fresh.valid.token', user })

    const res = await GET(
      createRequest('payload-token=stale.old.token; payload-token=fresh.valid.token'),
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ user })
    expect(setCookieHeaders(res)).toHaveLength(0)
  })
})
