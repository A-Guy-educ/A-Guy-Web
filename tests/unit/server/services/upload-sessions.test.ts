import { ObjectId } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  insertOne: vi.fn(),
}))

vi.mock('@/infra/db/content-db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/infra/db/content-db')>()
  return {
    ...actual,
    getContentDb: vi.fn(async () => ({
      collection: vi.fn(() => ({
        findOne: mocks.findOne,
        insertOne: mocks.insertOne,
      })),
    })),
  }
})

describe('resolveDefaultTenantId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the tenant _id as ObjectId when found', async () => {
    const tenantId = new ObjectId()
    mocks.findOne.mockResolvedValue({ _id: tenantId, slug: 'AGuy' })

    const { resolveDefaultTenantId } = await import('@/server/services/upload-sessions')
    const result = await resolveDefaultTenantId()

    expect(result).toBeInstanceOf(ObjectId)
    expect(result.toString()).toBe(tenantId.toString())
  })

  it('throws when the tenant is missing rather than returning a bogus id', async () => {
    mocks.findOne.mockResolvedValue(null)

    const { resolveDefaultTenantId } = await import('@/server/services/upload-sessions')

    await expect(resolveDefaultTenantId()).rejects.toThrow(/Default tenant/)
  })
})

describe('openUploadSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.insertOne.mockResolvedValue({ acknowledged: true })
  })

  it('inserts one document with tenant + createdBy as ObjectId, pathname included, status=initiated', async () => {
    const { openUploadSession } = await import('@/server/services/upload-sessions')

    const sessionId = new ObjectId()
    const tenant = new ObjectId()
    const createdBy = new ObjectId()
    const expiresAt = new Date('2026-12-31T00:00:00Z')

    const returned = await openUploadSession({
      _id: sessionId,
      tenant,
      createdBy,
      purpose: 'chat-media',
      originalFilename: 'photo.png',
      mimeType: 'image/png',
      expectedSize: 1234,
      pathname: 'chat-assets/tenant/user/session/photo.png',
      expiresAt,
    })

    expect(returned.toString()).toBe(sessionId.toString())
    expect(mocks.insertOne).toHaveBeenCalledOnce()

    const doc = mocks.insertOne.mock.calls[0][0]
    expect(doc._id).toBe(sessionId)
    expect(doc.tenant).toBeInstanceOf(ObjectId)
    expect(doc.createdBy).toBeInstanceOf(ObjectId)
    expect(doc.pathname).toBe('chat-assets/tenant/user/session/photo.png')
    expect(doc.status).toBe('initiated')
    expect(doc.originalFilename).toBe('photo.png')
    expect(doc.mimeType).toBe('image/png')
    expect(doc.expectedSize).toBe(1234)
    expect(doc.expiresAt).toEqual(expiresAt)
    expect(doc.createdAt).toBeInstanceOf(Date)
    expect(doc.updatedAt).toBeInstanceOf(Date)
  })
})
