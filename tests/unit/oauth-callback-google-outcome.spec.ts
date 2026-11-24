/**
 * The Google OAuth callback records, on the visitor's guest session, how a
 * sign-in that created no account ended — so the dashboard funnel can drop
 * existing students and split cancelled from failed sign-ins.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockValidateOAuthState = vi.hoisted(() => vi.fn())
const mockFindUserByGoogleSub = vi.hoisted(() => vi.fn())
const mockFindUserByEmail = vi.hoisted(() => vi.fn())
const mockCreateGoogleUser = vi.hoisted(() => vi.fn())
const mockCreateSession = vi.hoisted(() => vi.fn())
const mockClaimGuestSession = vi.hoisted(() => vi.fn())
const mockRecordGoogleOutcome = vi.hoisted(() => vi.fn())

vi.mock('@/infra/auth/oauth_state', () => ({ validateOAuthState: mockValidateOAuthState }))
vi.mock('@/infra/auth/oauth_url', () => ({ getPublicBaseUrl: () => 'https://app.example.com' }))
vi.mock('@/infra/auth/oauth_logger', () => ({
  logOAuthEvent: vi.fn().mockResolvedValue(undefined),
  logOAuthError: vi.fn(),
}))
vi.mock('@/infra/auth/web-auth', () => ({
  findUserByGoogleSub: mockFindUserByGoogleSub,
  findUserByEmail: mockFindUserByEmail,
  createGoogleUser: mockCreateGoogleUser,
  linkGoogleUser: vi.fn().mockResolvedValue(undefined),
  createSession: mockCreateSession,
  setAuthCookie: vi.fn(),
}))
vi.mock('@/infra/onboarding/redirect', () => ({
  getOnboardingRedirect: (returnTo: string) => returnTo,
  START_WIZARD_COMPLETED_COOKIE: 'start_wizard_completed',
}))
vi.mock('@/server/services/guest-sessions/guest-session-writer', () => ({
  claimGuestSession: mockClaimGuestSession,
  recordGoogleOutcome: mockRecordGoogleOutcome,
}))

import { GET } from '@/app/api/oauth/google/callback/route'

const GUEST_ID = '0b6f4c9e-3f1a-4d2b-9c8e-7a5d4e3f2a1b'

function request(query: string, { guest = true }: { guest?: boolean } = {}) {
  return {
    url: `https://app.example.com/api/oauth/google/callback?${query}`,
    headers: new Headers({ 'sec-fetch-dest': 'document' }),
    cookies: {
      get: (name: string) =>
        guest && name === 'guest_session_id' ? { value: GUEST_ID } : undefined,
    },
    nextUrl: { searchParams: new URLSearchParams(query), hostname: 'app.example.com' },
  }
}

describe('OAuth callback — Google outcome on the guest session', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateOAuthState.mockReturnValue({ valid: true, returnTo: '/courses/algebra' })
    mockFindUserByEmail.mockResolvedValue(null)
    mockCreateGoogleUser.mockResolvedValue({ _id: 'new-user' })
    mockCreateSession.mockResolvedValue({ token: 'session-token' })
    globalThis.fetch = vi.fn().mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          url.includes('/token')
            ? { access_token: 'access-token' }
            : { sub: 'google-sub', email: 'student@gmail.com', email_verified: true },
      }),
    ) as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('marks an existing student logging back in and clears the guest cookie', async () => {
    mockFindUserByGoogleSub.mockResolvedValue({ _id: 'old-user' })
    const res = await GET(request('code=c&state=s') as never)
    expect(mockRecordGoogleOutcome).toHaveBeenCalledWith(GUEST_ID, 'existing_login')
    expect(mockClaimGuestSession).not.toHaveBeenCalled()
    expect(res.cookies.get('guest_session_id')?.value).toBe('')
  })

  it('claims the session for a new account and records no outcome', async () => {
    mockFindUserByGoogleSub.mockResolvedValue(null)
    await GET(request('code=c&state=s') as never)
    expect(mockClaimGuestSession).toHaveBeenCalledWith(GUEST_ID, 'new-user')
    expect(mockRecordGoogleOutcome).not.toHaveBeenCalled()
  })

  it('records a cancel when the student backs out on Google', async () => {
    mockValidateOAuthState.mockReturnValue({ valid: true, returnTo: '/' })
    await GET(request('error=access_denied&state=s') as never)
    expect(mockRecordGoogleOutcome).toHaveBeenCalledWith(GUEST_ID, 'cancelled')
  })

  it('records a failure for a bad state or a callback error', async () => {
    mockValidateOAuthState.mockReturnValue({ valid: false, returnTo: '/' })
    await GET(request('code=c&state=bad') as never)
    expect(mockRecordGoogleOutcome).toHaveBeenLastCalledWith(GUEST_ID, 'failed')

    mockValidateOAuthState.mockReturnValue({ valid: true, returnTo: '/' })
    mockFindUserByGoogleSub.mockRejectedValue(new Error('db down'))
    await GET(request('code=c&state=s') as never)
    expect(mockRecordGoogleOutcome).toHaveBeenLastCalledWith(GUEST_ID, 'failed')
  })

  it('does nothing without a guest session cookie', async () => {
    mockFindUserByGoogleSub.mockResolvedValue({ _id: 'old-user' })
    await GET(request('code=c&state=s', { guest: false }) as never)
    expect(mockRecordGoogleOutcome).not.toHaveBeenCalled()
  })
})
