/**
 * Regression for issue #638 — queryActiveProducts must hide products that
 * are not linked to a valid course.
 *
 * Current behaviour (bug): `queryActiveProducts` only filters by
 * `isActive: true`, so any active product with no items / no course link
 * (e.g. the CMS product `new-z`) leaks into the public `/products` catalog.
 * Required behaviour: a product is only shown when it has either a direct
 * `course` relation that resolves to a published+active course, or `items`
 * that resolve to existing lessons on a published+active course.
 *
 * These tests mock the Mongo layer and assert on the array returned by
 * `queryActiveProducts()` — the unit under test. They will FAIL today
 * because the function returns everything `findManySerialized` returns;
 * they should PASS once the validation passes the issue's acceptance
 * criteria.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'

const { findManySerializedMock, findByIdSerializedMock } = vi.hoisted(() => ({
  findManySerializedMock: vi.fn(),
  findByIdSerializedMock: vi.fn(),
}))

vi.mock('@/server/repos/mongo', () => ({
  findManySerialized: findManySerializedMock,
  findByIdSerialized: findByIdSerializedMock,
}))

import { queryActiveProducts } from '@/server/repos/queries/products'

const COURSE_ID = '507f191e810c19729de860ea'
const LESSON_ID = '507f1f77bcf86cd799439011'
const PRODUCT_VALID_ID = '507f1f77bcf86cd799439020'
const PRODUCT_NO_ITEMS_ID = '507f1f77bcf86cd799439021'
const PRODUCT_BAD_LESSON_ID = '507f1f77bcf86cd799439022'

beforeEach(() => {
  vi.clearAllMocks()

  // Simulate the Mongo result set returned by the current query — every
  // active product, including invalid ones. The valid product links to a
  // real lesson → real course; the invalid products mirror the real
  // CMS bugs called out in the issue (`new-z` has no items; another links
  // to a lesson id that doesn't exist anymore).
  findManySerializedMock.mockResolvedValue([
    {
      id: PRODUCT_VALID_ID,
      slug: 'grade-7-prep',
      name: 'Grade 7 Prep',
      title: 'Grade 7 Prep',
      isActive: true,
      items: [{ id: 'item-1', type: 'lesson', lesson: LESSON_ID }],
    },
    {
      id: PRODUCT_NO_ITEMS_ID,
      slug: 'new-z',
      name: 'ז חדש',
      title: 'ז חדש',
      isActive: true,
      items: [],
    },
    {
      id: PRODUCT_NO_ITEMS_ID,
      slug: 'new-z-no-items',
      name: 'ז חדש (no items field)',
      title: 'ז חדש (no items field)',
      isActive: true,
    },
    {
      id: PRODUCT_BAD_LESSON_ID,
      slug: '7th-grade-prep-math',
      name: '7th Grade Prep Math',
      title: '7th Grade Prep Math',
      isActive: true,
      items: [{ id: 'item-2', type: 'lesson', lesson: '6a0ab8fddeadbeefdeadbeef' }],
    },
  ])

  // Default: every lesson/course lookup resolves to a real, published+active
  // record. Individual tests override this to simulate missing lessons.
  findByIdSerializedMock.mockImplementation(async (_collection: string, id: string) => {
    if (id === LESSON_ID) {
      return {
        id: LESSON_ID,
        chapter: new ObjectId().toString(),
      }
    }
    if (id === '6a0ab8fddeadbeefdeadbeef') {
      return null // lesson deleted from the system — the link is dangling
    }
    return null
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('queryActiveProducts — issue #638 validation', () => {
  it('hides products that have no items and no direct course link (the "new-z" bug)', async () => {
    const products = await queryActiveProducts()

    // `new-z` is `isActive: true` but has no items / no course link. It must
    // NOT appear in the storefront catalog.
    const slugs = products.map((p) => p.slug)
    expect(slugs).not.toContain('new-z')
    expect(slugs).not.toContain('new-z-no-items')
  })

  it('hides products whose items point to lessons that no longer exist', async () => {
    const products = await queryActiveProducts()

    // `7th-grade-prep-math` links to a lesson (`6a0ab8fd...`) that has been
    // deleted from the DB — that dangling reference must drop the product
    // from the storefront.
    const slugs = products.map((p) => p.slug)
    expect(slugs).not.toContain('7th-grade-prep-math')
  })

  it('still keeps products whose items point to real lessons', async () => {
    const products = await queryActiveProducts()

    // `grade-7-prep` is the canonical valid product — links to a real lesson
    // which links to a real course. It must stay.
    const slugs = products.map((p) => p.slug)
    expect(slugs).toContain('grade-7-prep')
  })
})