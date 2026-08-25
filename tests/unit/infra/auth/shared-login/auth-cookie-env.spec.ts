import { afterEach, describe, expect, it, vi } from 'vitest'

describe('deployment auth cookie name', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('keeps the established production name when no override exists', async () => {
    vi.stubEnv('AUTH_COOKIE_NAME', '')

    const { AUTH_COOKIE_NAME } = await import('@/infra/auth/shared-login/auth-cookie')

    expect(AUTH_COOKIE_NAME).toBe('payload-token')
  })

  it('uses a distinct name for an isolated development deployment', async () => {
    vi.stubEnv('AUTH_COOKIE_NAME', 'payload-token-dev')

    const { AUTH_COOKIE_NAME, authCookieClearHeaders, authCookieIdentity } =
      await import('@/infra/auth/shared-login/auth-cookie')
    const policy = {
      cookieDomain: '.dev.aguy.co.il',
      returnOrigins: [],
      apiOrigins: [],
    }

    expect(AUTH_COOKIE_NAME).toBe('payload-token-dev')
    expect(authCookieIdentity(policy)).toEqual({
      name: 'payload-token-dev',
      path: '/',
      domain: '.dev.aguy.co.il',
    })
    expect(authCookieClearHeaders(policy, true)).toContain(
      'payload-token-dev=; Path=/; Max-Age=0; HttpOnly; Secure; Domain=.dev.aguy.co.il; SameSite=None',
    )
  })
})
