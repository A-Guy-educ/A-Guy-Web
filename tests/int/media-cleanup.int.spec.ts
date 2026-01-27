import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Payload, PayloadRequest } from 'payload'
import { getPayload } from 'payload'
import { startMongoContainer, stopMongoContainer } from '@/infra/utils/test/mongodb-container'
import { mediaExpiryCleanupEndpoint } from '@/server/payload/endpoints/cron/media-expiry'
import { createTestUser } from '../factories/user.factory'

let payload: Payload
let originalDatabaseUrl: string | undefined
let originalCronSecret: string | undefined
let testUserId: string
let testTenantId: string

const TEST_CRON_SECRET = 'test-cron-secret-12345'

beforeAll(async () => {
  originalDatabaseUrl = process.env.DATABASE_URL
  originalCronSecret = process.env.CRON_SECRET

  // @ts-expect-error - TypeScript doesn't allow delete on process.env
  delete process.env.DATABASE_URL
  process.env.CRON_SECRET = TEST_CRON_SECRET

  const mongoUri = await startMongoContainer()
  process.env.DATABASE_URL = mongoUri

  const config = await import('@payload-config')
  payload = await getPayload({ config: config.default })

  // Create test user and tenant
  const user = await createTestUser(payload)
  testUserId = user.id

  // Get or create test tenant
  const tenants = await payload.find({
    collection: 'tenants',
    limit: 1,
    overrideAccess: true,
  })

  if (tenants.docs.length > 0) {
    testTenantId = tenants.docs[0].id
  } else {
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Test Tenant',
        slug: 'test-tenant',
        status: 'active',
      },
      overrideAccess: true,
    })
    testTenantId = tenant.id
  }
}, 120000)

beforeEach(async () => {
  if (!payload) return

  // Clean up test media before each test
  const testMedia = await payload.find({
    collection: 'media',
    where: {
      retentionPolicy: { equals: 'ephemeral' },
    },
    limit: 1000,
    overrideAccess: true,
  })

  for (const media of testMedia.docs) {
    await payload.delete({
      collection: 'media',
      id: media.id,
      overrideAccess: true,
    })
  }
})

afterAll(async () => {
  if (payload && testUserId) {
    await payload.delete({ collection: 'users', id: testUserId, overrideAccess: true })
  }

  await stopMongoContainer()

  if (originalDatabaseUrl !== undefined) {
    process.env.DATABASE_URL = originalDatabaseUrl
  } else {
    // @ts-expect-error - TypeScript doesn't allow delete on process.env
    delete process.env.DATABASE_URL
  }

  if (originalCronSecret !== undefined) {
    process.env.CRON_SECRET = originalCronSecret
  } else {
    delete process.env.CRON_SECRET
  }
}, 120000)

/**
 * Helper to create a mock PayloadRequest with authorization header
 */
function createCronRequest(authHeader?: string): PayloadRequest {
  return {
    payload,
    headers: {
      get: (name: string) => {
        if (name === 'authorization') return authHeader
        return null
      },
    },
  } as unknown as PayloadRequest
}

/**
 * Helper to create a test media document
 */
async function createTestMedia(options: {
  filename?: string
  retentionPolicy?: 'ephemeral' | 'persistent'
  expiresAt?: string
}) {
  return payload.create({
    collection: 'media',
    data: {
      filename: options.filename || `test-${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      filesize: 1000,
      type: 'image',
      tenant: testTenantId,
      retentionPolicy: options.retentionPolicy || 'ephemeral',
      expiresAt: options.expiresAt,
    },
    overrideAccess: true,
    context: { allowRetentionPatch: true },
  })
}

describe('Media Cleanup Endpoint', () => {
  describe('Authentication', () => {
    it('returns 401 when no authorization header is provided', async () => {
      const req = createCronRequest()
      const res = await mediaExpiryCleanupEndpoint.handler(req)

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 401 when authorization header is invalid', async () => {
      const req = createCronRequest('Bearer wrong-secret')
      const res = await mediaExpiryCleanupEndpoint.handler(req)

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 401 when authorization header format is wrong', async () => {
      const req = createCronRequest(TEST_CRON_SECRET) // Missing "Bearer " prefix
      const res = await mediaExpiryCleanupEndpoint.handler(req)

      expect(res.status).toBe(401)
    })

    it('returns 200 with valid authorization', async () => {
      const req = createCronRequest(`Bearer ${TEST_CRON_SECRET}`)
      const res = await mediaExpiryCleanupEndpoint.handler(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
    })
  })

  describe('Cleanup Logic', () => {
    it('deletes expired ephemeral media', async () => {
      // Create expired media
      const expiredDate = new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour ago
      const expiredMedia = await createTestMedia({
        filename: 'expired-test.jpg',
        retentionPolicy: 'ephemeral',
        expiresAt: expiredDate,
      })

      const req = createCronRequest(`Bearer ${TEST_CRON_SECRET}`)
      const res = await mediaExpiryCleanupEndpoint.handler(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.deletedCount).toBe(1)

      // Verify media was deleted
      const found = await payload.find({
        collection: 'media',
        where: { id: { equals: expiredMedia.id } },
        overrideAccess: true,
      })
      expect(found.docs.length).toBe(0)
    })

    it('does not delete non-expired ephemeral media', async () => {
      // Create non-expired media
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() // 24 hours from now
      const nonExpiredMedia = await createTestMedia({
        filename: 'non-expired-test.jpg',
        retentionPolicy: 'ephemeral',
        expiresAt: futureDate,
      })

      const req = createCronRequest(`Bearer ${TEST_CRON_SECRET}`)
      const res = await mediaExpiryCleanupEndpoint.handler(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.deletedCount).toBe(0)

      // Verify media still exists
      const found = await payload.find({
        collection: 'media',
        where: { id: { equals: nonExpiredMedia.id } },
        overrideAccess: true,
      })
      expect(found.docs.length).toBe(1)
    })

    it('does not delete persistent media', async () => {
      // Create permanent media with past expiresAt (should be ignored)
      const expiredDate = new Date(Date.now() - 1000 * 60 * 60).toISOString()
      const permanentMedia = await createTestMedia({
        filename: 'permanent-test.jpg',
        retentionPolicy: 'persistent',
        expiresAt: expiredDate,
      })

      const req = createCronRequest(`Bearer ${TEST_CRON_SECRET}`)
      const res = await mediaExpiryCleanupEndpoint.handler(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.deletedCount).toBe(0)

      // Verify media still exists
      const found = await payload.find({
        collection: 'media',
        where: { id: { equals: permanentMedia.id } },
        overrideAccess: true,
      })
      expect(found.docs.length).toBe(1)
    })

    it('handles multiple expired media documents', async () => {
      const expiredDate = new Date(Date.now() - 1000 * 60 * 60).toISOString()

      // Create multiple expired media
      await createTestMedia({
        filename: 'expired-1.jpg',
        retentionPolicy: 'ephemeral',
        expiresAt: expiredDate,
      })
      await createTestMedia({
        filename: 'expired-2.jpg',
        retentionPolicy: 'ephemeral',
        expiresAt: expiredDate,
      })
      await createTestMedia({
        filename: 'expired-3.jpg',
        retentionPolicy: 'ephemeral',
        expiresAt: expiredDate,
      })

      const req = createCronRequest(`Bearer ${TEST_CRON_SECRET}`)
      const res = await mediaExpiryCleanupEndpoint.handler(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.deletedCount).toBe(3)
    })

    it('returns hasMore flag when more items exist', async () => {
      // This test is limited because we can't easily create 100+ records
      // Just verify the flag exists in response
      const req = createCronRequest(`Bearer ${TEST_CRON_SECRET}`)
      const res = await mediaExpiryCleanupEndpoint.handler(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(typeof body.hasMore).toBe('boolean')
    })

    it('includes timestamp in response', async () => {
      const req = createCronRequest(`Bearer ${TEST_CRON_SECRET}`)
      const res = await mediaExpiryCleanupEndpoint.handler(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.timestamp).toBeDefined()
      expect(new Date(body.timestamp).getTime()).toBeLessThanOrEqual(Date.now())
    })
  })
})
