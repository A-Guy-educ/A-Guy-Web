/**
 * Characterization tests for POST /api/blob/upload-token.
 *
 * This route hands out a token that lets a browser write directly to blob
 * storage, so the limits it enforces — who is asking, what type, how big — are
 * the security boundary and are pinned before its queries move.
 *
 * `handleUpload` from @vercel/blob is stubbed to invoke the callbacks the route
 * supplies, which is where all of that logic lives.
 */

import { ObjectId } from 'mongodb'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockContentDb, type Doc } from './helpers/fake-content-db'

const db = vi.hoisted(() => ({ current: null as ReturnType<typeof mockContentDb> | null }))
const mockRequireUser = vi.hoisted(() => vi.fn())
const captured = vi.hoisted(() => ({
  onBeforeGenerateToken: null as
    | ((pathname: string, payload: string | null) => Promise<Record<string, unknown>>)
    | null,
  onUploadCompleted: null as
    | ((event: { blob: Record<string, string>; tokenPayload: string }) => Promise<void>)
    | null,
}))

vi.mock('@/infra/db/content-db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/infra/db/content-db')>()
  return { ...actual, getContentDb: async () => db.current!.db }
})

vi.mock('@/server/auth/api-auth', () => ({ requireUser: mockRequireUser }))

vi.mock('@vercel/blob/client', () => ({
  handleUpload: async (options: Record<string, unknown>) => {
    captured.onBeforeGenerateToken = options.onBeforeGenerateToken as never
    captured.onUploadCompleted = options.onUploadCompleted as never
    return { handled: true }
  },
}))

// USER_ID and TENANT_ID must be valid ObjectId strings — the route now
// converts them to ObjectId before writing to satisfy Admin's schema validator
// on upload-sessions.
const USER_ID = '507f1f77bcf86cd799439012'
const TENANT_ID = '507f1f77bcf86cd799439013'
const SESSION_ID = '507f1f77bcf86cd799439011'

/** The route looks the tenant up by this slug; keep the seed in step with it. */
const TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'AGuy'

function seed(seedData: Record<string, Doc[]> = {}) {
  db.current = mockContentDb(seedData)
  return db.current
}

async function requestToken() {
  const { POST } = await import('@/app/api/blob/upload-token/route')
  return POST(
    new NextRequest('http://localhost/api/blob/upload-token', {
      method: 'POST',
      body: JSON.stringify({ type: 'blob.generate-client-token' }),
      headers: { 'content-type': 'application/json' },
    }),
  )
}

function clientPayload(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    originalFilename: 'photo.png',
    contentType: 'image/png',
    size: 1024,
    purpose: 'chat-media',
    ...overrides,
  })
}

describe('POST /api/blob/upload-token', () => {
  beforeEach(() => {
    seed({ tenants: [{ _id: new ObjectId(TENANT_ID), slug: TENANT_SLUG }] })
    mockRequireUser.mockReset().mockResolvedValue({ ok: true, value: { id: USER_ID } })
    captured.onBeforeGenerateToken = null
    captured.onUploadCompleted = null
  })

  it('refuses an anonymous caller before reaching blob storage', async () => {
    mockRequireUser.mockResolvedValue({
      ok: false,
      response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const response = await requestToken()

    expect(response.status).toBe(401)
    expect(captured.onBeforeGenerateToken).toBeNull()
  })

  it('opens an upload session recording who asked and for what', async () => {
    const fake = seed({ tenants: [{ _id: new ObjectId(TENANT_ID), slug: TENANT_SLUG }] })
    await requestToken()

    await captured.onBeforeGenerateToken!('ignored', clientPayload())

    expect(fake.collections['upload-sessions']).toHaveLength(1)
    const session = fake.collections['upload-sessions'][0] as Record<string, unknown>
    expect(session).toMatchObject({
      purpose: 'chat-media',
      originalFilename: 'photo.png',
      mimeType: 'image/png',
      expectedSize: 1024,
      status: 'initiated',
    })
    // Both stored as ObjectId to satisfy Admin's relationship-field validator.
    expect(session.createdBy).toBeInstanceOf(ObjectId)
    expect(String(session.createdBy)).toBe(USER_ID)
    expect(session.tenant).toBeInstanceOf(ObjectId)
    expect(String(session.tenant)).toBe(TENANT_ID)
    // pathname must be present on the initial insert — it is required by the
    // schema, and the two-step insert-then-update the old code did no longer
    // exists.
    expect(session.pathname).toEqual(expect.stringContaining(TENANT_ID))
  })

  it('limits the token to the requested content type', async () => {
    await requestToken()

    const token = await captured.onBeforeGenerateToken!('ignored', clientPayload())

    expect(token.allowedContentTypes).toEqual(['image/png'])
    expect(token.addRandomSuffix).toBe(false)
    expect(token.allowOverwrite).toBe(false)
  })

  it('refuses a file larger than the limit', async () => {
    await requestToken()

    await expect(
      captured.onBeforeGenerateToken!('ignored', clientPayload({ size: 10 ** 12 })),
    ).rejects.toThrow('File size exceeds maximum')
  })

  it('refuses a content type that is not allowed', async () => {
    await requestToken()

    await expect(
      captured.onBeforeGenerateToken!(
        'ignored',
        clientPayload({ contentType: 'application/x-sh' }),
      ),
    ).rejects.toThrow('is not allowed')
  })

  it('refuses a malformed payload', async () => {
    await requestToken()

    await expect(
      captured.onBeforeGenerateToken!('ignored', JSON.stringify({ originalFilename: '' })),
    ).rejects.toThrow()
  })

  it('writes no session when the request is refused', async () => {
    const fake = seed({ tenants: [{ _id: new ObjectId(TENANT_ID), slug: TENANT_SLUG }] })
    await requestToken()

    await captured.onBeforeGenerateToken!(
      'ignored',
      clientPayload({ contentType: 'application/x-sh' }),
    ).catch(() => undefined)

    expect(fake.collections['upload-sessions'] ?? []).toHaveLength(0)
  })

  it('scopes the upload path to the tenant and user', async () => {
    const fake = seed({ tenants: [{ _id: new ObjectId(TENANT_ID), slug: TENANT_SLUG }] })
    await requestToken()

    await captured.onBeforeGenerateToken!('ignored', clientPayload())

    const { pathname } = fake.collections['upload-sessions'][0] as { pathname: string }
    expect(pathname).toContain(TENANT_ID)
    expect(pathname).toContain(USER_ID)
  })

  it('surfaces a clear error when no tenant document exists', async () => {
    // The old code silently substituted the string 'default', which fails
    // Admin's ObjectId validator anyway. The new contract throws so callers
    // see a real error instead of the generic validator failure.
    seed({ tenants: [] })

    const response = await requestToken()

    expect(response.status).toBe(500)
    const body = (await response.json()) as { message?: string }
    expect(body.message).toMatch(/Default tenant/)
    expect(captured.onBeforeGenerateToken).toBeNull()
  })

  it('marks the session uploaded once the file lands', async () => {
    const fake = seed({
      tenants: [{ _id: new ObjectId(TENANT_ID), slug: TENANT_SLUG }],
      'upload-sessions': [{ _id: SESSION_ID, status: 'initiated' }],
    })
    await requestToken()

    await captured.onUploadCompleted!({
      blob: { url: 'https://blob.example/x.png', pathname: 'chat/x.png' },
      tokenPayload: JSON.stringify({ uploadSessionId: SESSION_ID }),
    })

    expect(fake.collections['upload-sessions'][0]).toMatchObject({
      status: 'uploaded',
      blobUrl: 'https://blob.example/x.png',
      pathname: 'chat/x.png',
    })
  })

  it('ignores a completion callback with no session to update', async () => {
    const fake = seed({
      tenants: [{ _id: new ObjectId(TENANT_ID), slug: TENANT_SLUG }],
      'upload-sessions': [{ _id: SESSION_ID, status: 'initiated' }],
    })
    await requestToken()

    await captured.onUploadCompleted!({
      blob: { url: 'https://blob.example/x.png', pathname: 'chat/x.png' },
      tokenPayload: JSON.stringify({}),
    })

    expect(fake.collections['upload-sessions'][0]).toMatchObject({ status: 'initiated' })
  })
})
