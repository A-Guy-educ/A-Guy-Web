/**
 * Unit tests for the active-vs-soon split on the products page.
 *
 * The store page (issue #715) renders paid products as the big featured card
 * with the לרכישה button, and inactive / unset products as compact cards with
 * a disabled בקרוב button. The split is driven by the `isActive` field on
 * each Product document — and the helper that does the splitting has to be
 * conservative (literal `true` only) so a product that hasn't been
 * activated yet doesn't accidentally show up as buyable.
 *
 * @fileType integration-test
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
  relationId: vi.fn(),
  serializeDoc: vi.fn((doc) => doc),
}))

import {
  queryAllProductsSplit,
  splitProductsByActive,
  type ProductsSplit,
} from '@/server/repos/queries/products'
import type { Product } from '@/infra/types/content'

function mkProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: overrides.id ?? 'p1',
    title: overrides.title ?? 'P1',
    name: overrides.name ?? 'P1',
    ...overrides,
  }
}

describe('splitProductsByActive', () => {
  it('partitions products by `isActive === true`', () => {
    const a = mkProduct({ id: 'a', isActive: true })
    const b = mkProduct({ id: 'b', isActive: false })
    const c = mkProduct({ id: 'c', isActive: true })
    const d = mkProduct({ id: 'd' }) // missing isActive

    const { active, soon } = splitProductsByActive([a, b, c, d])

    expect(active.map((p) => p.id)).toEqual(['a', 'c'])
    expect(soon.map((p) => p.id)).toEqual(['b', 'd'])
  })

  it('treats `null` and `undefined` as soon (not active)', () => {
    const a = mkProduct({ id: 'a', isActive: null })
    const b = mkProduct({ id: 'b', isActive: undefined })
    const c = mkProduct({ id: 'c' })

    const { active, soon } = splitProductsByActive([a, b, c])

    expect(active).toEqual([])
    expect(soon.map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('does not coerce truthy non-boolean values (e.g. 1, "true")', () => {
    // Defensive: only literal `true` should be active. A future migration
    // that briefly sets `isActive: 1` or `isActive: "true"` MUST NOT cause
    // products to show up as buyable before the data is cleaned up.
    const numericActive = mkProduct({ id: 'n', isActive: 1 as unknown as boolean })
    const stringActive = mkProduct({ id: 's', isActive: 'true' as unknown as boolean })

    const { active, soon } = splitProductsByActive([numericActive, stringActive])

    expect(active).toEqual([])
    expect(soon).toHaveLength(2)
  })

  it('preserves input order within each bucket', () => {
    const products = [
      mkProduct({ id: '1', isActive: true }),
      mkProduct({ id: '2', isActive: false }),
      mkProduct({ id: '3', isActive: true }),
      mkProduct({ id: '4', isActive: false }),
    ]

    const { active, soon } = splitProductsByActive(products)

    expect(active.map((p) => p.id)).toEqual(['1', '3'])
    expect(soon.map((p) => p.id)).toEqual(['2', '4'])
  })

  it('returns two empty arrays for an empty input', () => {
    const { active, soon } = splitProductsByActive([])
    expect(active).toEqual([])
    expect(soon).toEqual([])
  })
})

describe('queryAllProductsSplit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches all products (no isActive filter) and partitions them', async () => {
    findManySerializedMock.mockResolvedValueOnce([
      mkProduct({ id: 'active-1', isActive: true }),
      mkProduct({ id: 'soon-1', isActive: false }),
      mkProduct({ id: 'soon-2' }),
    ])

    const result: ProductsSplit = await queryAllProductsSplit()

    // Crucial: the query must NOT pre-filter on isActive at the Mongo level,
    // otherwise soon products never reach the helper and the page can't
    // render them. Empty filter (`{}`) is the contract.
    expect(findManySerializedMock).toHaveBeenCalledWith(
      'products',
      {},
      expect.objectContaining({ limit: expect.any(Number) }),
    )

    expect(result.active.map((p) => p.id)).toEqual(['active-1'])
    expect(result.soon.map((p) => p.id)).toEqual(['soon-1', 'soon-2'])
  })

  it('normalizes each product (title fallback to name)', async () => {
    findManySerializedMock.mockResolvedValueOnce([
      mkProduct({ id: 'p', name: 'Display Name', isActive: true, title: '' }),
    ])

    const result = await queryAllProductsSplit()

    expect(result.active[0].title).toBe('Display Name')
  })
})
