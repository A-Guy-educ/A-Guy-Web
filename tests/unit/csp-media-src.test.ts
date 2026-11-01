import { describe, expect, it } from 'vitest'

import { contentSecurityPolicy } from '@/infra/security/content-security-policy.js'

function extractDirective(csp: string, directive: string): string | null {
  const match = csp.match(new RegExp(`${directive}\\s+([^;]+)`))
  return match ? match[1] : null
}

describe('CSP media-src for uploaded video and audio', () => {
  it('permits the Vercel Blob store hosts that /api/media/file redirects to', () => {
    // Exercise media blocks point <video>/<audio> at `/api/media/file/<name>`,
    // which 307s to `<store>.public.blob.vercel-storage.com`. CSP checks the
    // redirect target, so without this entry every uploaded video fails with
    // "videoLoadError" while images (allowed via img-src) keep working.
    const mediaSrc = extractDirective(contentSecurityPolicy, 'media-src')

    expect(mediaSrc).not.toBeNull()
    expect(mediaSrc).toContain('*.blob.vercel-storage.com')
  })

  it('keeps blob: for in-browser generated audio (Piper TTS)', () => {
    expect(extractDirective(contentSecurityPolicy, 'media-src')).toContain('blob:')
  })
})
