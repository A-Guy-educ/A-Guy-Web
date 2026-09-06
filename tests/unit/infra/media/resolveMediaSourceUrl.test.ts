import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resolveMediaSourceUrl } from '@/infra/media/resolveMediaSourceUrl'

describe('resolveMediaSourceUrl', () => {
  const originalAdminUrl = process.env.NEXT_PUBLIC_ADMIN_URL

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ADMIN_URL
  })

  afterEach(() => {
    if (originalAdminUrl === undefined) delete process.env.NEXT_PUBLIC_ADMIN_URL
    else process.env.NEXT_PUBLIC_ADMIN_URL = originalAdminUrl
  })

  it('returns null for empty input', () => {
    expect(resolveMediaSourceUrl(null)).toBeNull()
    expect(resolveMediaSourceUrl(undefined)).toBeNull()
    expect(resolveMediaSourceUrl('')).toBeNull()
  })

  it('returns absolute Blob URLs unchanged', () => {
    const blobUrl = 'https://example.public.blob.vercel-storage.com/media/foo.pdf'
    expect(resolveMediaSourceUrl(blobUrl)).toBe(blobUrl)
  })

  it('returns absolute http URLs unchanged', () => {
    expect(resolveMediaSourceUrl('http://cdn.example.com/foo.png')).toBe(
      'http://cdn.example.com/foo.png',
    )
  })

  it('rewrites Admin proxy paths to absolute Admin URLs', () => {
    process.env.NEXT_PUBLIC_ADMIN_URL = 'https://a-guy-admin.vercel.app'

    expect(resolveMediaSourceUrl('/api/media/file/foo.pdf')).toBe(
      'https://a-guy-admin.vercel.app/api/media/file/foo.pdf',
    )
  })

  it('strips trailing slashes on the Admin base', () => {
    process.env.NEXT_PUBLIC_ADMIN_URL = 'https://a-guy-admin.vercel.app/'

    expect(resolveMediaSourceUrl('/api/media/file/foo.pdf')).toBe(
      'https://a-guy-admin.vercel.app/api/media/file/foo.pdf',
    )
  })

  it('returns null for a proxy path when Admin URL is not configured', () => {
    expect(resolveMediaSourceUrl('/api/media/file/foo.pdf')).toBeNull()
  })

  it('returns null for relative paths outside /api/media/', () => {
    process.env.NEXT_PUBLIC_ADMIN_URL = 'https://a-guy-admin.vercel.app'

    expect(resolveMediaSourceUrl('/foo.pdf')).toBeNull()
    expect(resolveMediaSourceUrl('/other/path')).toBeNull()
  })
})
