/**
 * Unit tests for queryInactiveProducts — storefront "coming soon" list.
 *
 * The query must return ONLY products where isActive is not strictly true
 * (i.e. inactive OR free products), normalised the same way queryActiveProducts
 * does (title falls back to name). It must use a stable sort (createdAt) so
 * the demo order matches the design reference.
 *
 * @fileType unit-test
 * @domain billing
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
  relationId: vi.fn((id: unknown) => (typeof id === 'string' ? id : id ? String(id) : null)),
  serializeDoc: vi.fn((doc: unknown) => doc),
}))

import { queryInactiveProducts } from '@/server/repos/queries/products'

describe('queryInactiveProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries the products collection with isActive: { $ne: true }', async () => {
    findManySerializedMock.mockResolvedValueOnce([])
    await queryInactiveProducts()

    expect(findManySerializedMock).toHaveBeenCalledWith(
      'products',
      { isActive: { $ne: true } },
      expect.objectContaining({ sort: { createdAt: 1 }, limit: 100 }),
    )
  })

  it('returns the products unchanged when no normalisation is needed', async () => {
    findManySerializedMock.mockResolvedValueOnce([
      { id: 'a', slug: 'a', title: 'כיתה ח׳', isActive: false, price: 149 },
    ])

    const result = await queryInactiveProducts()

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('כיתה ח׳')
  })

  it('falls back to `name` when `title` is empty', async () => {
    // Covers the same normalisation path as queryActiveProducts so a
    // mixed-shape collection doesn't crash the storefront.
    findManySerializedMock.mockResolvedValueOnce([
      { id: 'b', slug: 'b', title: '', name: 'Fallback Name', isActive: false },
    ])

    const result = await queryInactiveProducts()

    expect(result[0].title).toBe('Fallback Name')
  })

  it('returns an empty array when no inactive products exist', async () => {
    findManySerializedMock.mockResolvedValueOnce([])

    const result = await queryInactiveProducts()

    expect(result).toEqual([])
  })
})
