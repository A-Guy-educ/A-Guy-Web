import { describe, expect, it } from 'vitest'

import { contentSecurityPolicy } from '@/infra/security/content-security-policy.js'

function extractDirective(csp: string, directive: string): string | null {
  const match = csp.match(new RegExp(`${directive}\\s+([^;]+)`))
  return match ? match[1] : null
}

describe('CSP allowlist for @vercel/blob client uploads', () => {
  it('permits the direct-to-Blob upload API host in connect-src', () => {
    // `@vercel/blob/client`'s `upload()` posts to `https://vercel.com/api/blob`
    // (see `defaultVercelBlobApiUrl` in the SDK). Without this entry the browser
    // silently blocks the request under our CSP and the chat photo upload
    // hangs at 0% with no error and no network entry.
    const connectSrc = extractDirective(contentSecurityPolicy, 'connect-src')

    expect(connectSrc).not.toBeNull()
    expect(connectSrc).toContain('https://vercel.com')
  })

  it('still permits the underlying Blob store hosts the SDK redirects to', () => {
    const connectSrc = extractDirective(contentSecurityPolicy, 'connect-src')

    expect(connectSrc).toContain('https://blob.vercel-storage.com')
    expect(connectSrc).toContain('https://*.blob.vercel-storage.com')
  })
})
