/**
 * Unit tests for queryInactiveProducts — the secondary /products grid query.
 *
 * Verifies the `$or` shape picks up both shapes that make a product
 * un-purchasable: `isActive !== true` OR `price` is null/0.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { findManySerializedMock } = vi.hoisted(() => ({
  findManySerializedMock: vi.fn(),
}))

vi.mock('@/server/repos/mongo', () => ({
  findManySerialized: findManySerializedMock,
  findOneSerialized: vi.fn(),
}))

vi.mock('@/infra/db/content-db', () => ({
  getContentDb: vi.fn(),
}))

import { queryInactiveProducts } from '@/server/repos/queries/products'

describe('queryInactiveProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries the products collection with an $or that covers inactive + free', async () => {
    findManySerializedMock.mockResolvedValueOnce([])

    await queryInactiveProducts()

    expect(findManySerializedMock).toHaveBeenCalledTimes(1)
    const [collection, filter, options] = findManySerializedMock.mock.calls[0]

    expect(collection).toBe('products')
    // Both inactive AND free should be picked up — the inactive section must
    // not silently drop free products because their `isActive` flag is true.
    expect(filter).toEqual({
      $or: [{ isActive: { $ne: true } }, { price: { $in: [null, 0] } }],
    })
    expect(options).toEqual({ sort: { createdAt: 1 }, limit: 100 })
  })

  it('normalizes each product — falls back from title to name', async () => {
    findManySerializedMock.mockResolvedValueOnce([
      { id: '1', title: 'Already has title', name: 'Wrong', slug: 'a' },
      { id: '2', title: '', name: 'From name', slug: 'b' },
    ])

    const result = await queryInactiveProducts()

    expect(result[0].title).toBe('Already has title')
    expect(result[1].title).toBe('From name')
  })
})
