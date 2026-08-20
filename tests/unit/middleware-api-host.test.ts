import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { middleware } from '@/middleware'

function createRequest(pathname: string, host = 'api.aguy.co.il') {
  const url = new URL(pathname, `https://${host}`)
  return new NextRequest(url, { headers: { host } })
}

describe('public API hostname', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns a small health response at the API root', async () => {
    const response = middleware(createRequest('/'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ service: 'A-Guy API', status: 'ok' })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('does not expose ordinary website routes on the API hostname', async () => {
    const response = middleware(createRequest('/courses'))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Not found' })
  })

  it('allows API routes to continue to their route handlers', () => {
    const response = middleware(createRequest('/api/users/me'))

    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('does not restrict the main web hostname', () => {
    const response = middleware(createRequest('/courses', 'www.aguy.co.il'))

    expect(response.status).not.toBe(404)
  })

  it('supports an explicitly configured API hostname', () => {
    vi.stubEnv('API_PUBLIC_HOST', 'api.lvh.me')

    expect(middleware(createRequest('/', 'api.lvh.me')).status).toBe(200)
    expect(middleware(createRequest('/courses', 'api.lvh.me')).status).toBe(404)
  })
})
