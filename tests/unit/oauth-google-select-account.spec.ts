/**
 * Schools share computers: after a student signs out, the next "Sign in with
 * Google" must show Google's account chooser instead of silently reusing the
 * Google account the browser is still signed into.
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/infra/auth/oauth_state', () => ({
  storeOAuthState: vi.fn().mockResolvedValue('test-state'),
}))

vi.mock('@/infra/auth/oauth_url', () => ({
  getPublicBaseUrl: () => 'https://www.aguy.co.il',
}))

describe('GET /api/oauth/google', () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
  })

  it('forces the Google account chooser', async () => {
    const { GET } = await import('@/app/api/oauth/google/route')

    const res = await GET(new NextRequest('https://www.aguy.co.il/api/oauth/google'))
    const location = new URL(res.headers.get('Location')!)

    expect(location.origin + location.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(location.searchParams.get('prompt')).toBe('select_account')
    expect(location.searchParams.get('state')).toBe('test-state')
  })
})
