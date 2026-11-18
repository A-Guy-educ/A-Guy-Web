import { ObjectId } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const insertOne = vi.hoisted(() => vi.fn())

vi.mock('@/infra/db/content-db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/infra/db/content-db')>()
  return {
    ...actual,
    getContentDb: async () => ({
      collection: () => ({ insertOne, createIndex: async () => 'ok' }),
    }),
  }
})

import { buildFunnelEventDoc, recordFunnelEvent } from '@/server/services/funnel-events'

const NOW = new Date('2026-11-18T10:00:00Z')
const USER = '507f1f77bcf86cd799439011'

describe('buildFunnelEventDoc', () => {
  it('stores the user as an ObjectId and clips the path', () => {
    const doc = buildFunnelEventDoc(
      { type: 'paywall_shown', userId: USER, gate: 'exercise', path: `/${'a'.repeat(400)}` },
      NOW,
    )
    expect(doc).toMatchObject({ type: 'paywall_shown', gate: 'exercise', createdAt: NOW })
    expect(doc.user).toEqual(new ObjectId(USER))
    expect((doc.path as string).length).toBe(300)
  })

  it('keeps anonymous pricing views with a null user', () => {
    expect(buildFunnelEventDoc({ type: 'pricing_viewed', userId: null }, NOW)).toEqual({
      type: 'pricing_viewed',
      user: null,
      returnTo: null,
      createdAt: NOW,
    })
  })

  it('records the checkout tier, offer and Admin status', () => {
    expect(
      buildFunnelEventDoc(
        {
          type: 'checkout_started',
          userId: USER,
          tier: 'basic',
          offerSlug: 'intro3mo',
          status: 409,
        },
        NOW,
      ),
    ).toMatchObject({ tier: 'basic', offerSlug: 'intro3mo', status: 409 })
  })
})

describe('recordFunnelEvent', () => {
  beforeEach(() => {
    insertOne.mockReset()
  })

  it('inserts one doc', async () => {
    insertOne.mockResolvedValue({})
    await recordFunnelEvent({ type: 'pricing_viewed', userId: USER, returnTo: '/study' })
    expect(insertOne).toHaveBeenCalledTimes(1)
    expect(insertOne.mock.calls[0][0]).toMatchObject({ type: 'pricing_viewed', returnTo: '/study' })
  })

  it('never throws when the write fails', async () => {
    insertOne.mockImplementation(async () => {
      throw new Error('db down')
    })
    await expect(
      recordFunnelEvent({ type: 'paywall_shown', userId: USER, gate: 'lesson' }),
    ).resolves.toBeUndefined()
  })
})
