import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { contentSecurityPolicy } from '@/infra/security/content-security-policy.js'
import { middleware } from '@/middleware'

describe('middleware CSP', () => {
  function createRequest(pathname = '/start') {
    const url = new URL(pathname, 'https://kp-866cab-523991-pr-34.fly.dev')
    const headers = new Headers()
    headers.set('host', url.host)

    return new NextRequest(url, { headers })
  }

  it('sets the shared CSP on preview pages', () => {
    const response = middleware(createRequest('/start'))

    expect(response.headers.get('Content-Security-Policy')).toBe(contentSecurityPolicy)
  })

  it('does not emit frame ancestor restrictions', () => {
    const response = middleware(createRequest('/start'))
    const csp = response.headers.get('Content-Security-Policy')

    expect(csp).not.toContain('frame-ancestors')
    expect(csp).not.toContain('kody-dashboard-aguy.vercel.app')
    expect(csp).not.toContain('kody-dashboard-sable.vercel.app')
  })

  it('keeps the PDF viewer free to use its own response headers', () => {
    const response = middleware(createRequest('/api/pdfjs-viewer'))

    expect(response.headers.get('Content-Security-Policy')).toBeNull()
  })
})
