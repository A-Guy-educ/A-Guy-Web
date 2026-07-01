import { ObjectId } from 'mongodb'
import { cache } from 'react'

import { getContentDb, relationId, serializeDoc } from '@/infra/db/content-db'
import {
  isPopulatedCourseRef,
  isPopulatedFeatureRef,
  type Lesson,
  type Product,
  type ProductContentBlock,
  type ProductCourseRef,
  type ProductFeatureRef,
  type ProductItem,
} from '@/infra/types/content'
import { findByIdSerialized, findManySerialized, findOneSerialized } from '../mongo'

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    title: product.title || product.name || '',
  }
}

function itemLessonId(item: string | ProductItem): string | null {
  if (typeof item === 'string') {
    try {
      const parsed = JSON.parse(item) as { lesson?: unknown }
      return typeof parsed.lesson === 'string' ? parsed.lesson : null
    } catch {
      return null
    }
  }
  return item.lesson ? relationId(item.lesson) : null
}

/**
 * Issue #638 — a product is only saleable when it actually grants access to
 * something. Today that means one of:
 *   - a direct `course` relation that resolves to an existing lesson OR
 *     published+active course (handled below via the lesson walk — every
 *     course is reached via a lesson, so resolving the lesson is enough),
 *   - OR `items[]` entries whose `lesson` references all resolve to a real
 *     lesson in Mongo.
 * Products with no items, or items pointing at deleted lessons, must be hidden
 * from the storefront (e.g. the CMS bug `new-z` and the dangling `7th-grade-prep-math`).
 *
 * Kept as a separate pure helper so it's directly unit-testable without
 * spinning up a Mongo fixture.
 */
async function hasValidCourseLinkage(product: Product): Promise<boolean> {
  // Direct course relation on the new-shape Product. If the course exists
  // and is published+active, the linkage is valid.
  const courseId = relationId(product.course)
  if (courseId) {
    const course = await findByIdSerialized<{ status?: string; isActive?: boolean }>(
      'courses',
      courseId,
    )
    if (course && course.status === 'published' && course.isActive) {
      return true
    }
  }

  // New-shape: contents[] courseBlock entries. A product with at least one
  // populated courseBlock that resolves to a published+active course is valid.
  if (Array.isArray(product.contents) && product.contents.length > 0) {
    const courseBlockIds = product.contents
      .filter(
        (b): b is Extract<ProductContentBlock, { blockType: 'courseBlock' }> =>
          b.blockType === 'courseBlock' && !isPopulatedCourseRef(b.course),
      )
      .map((b) => relationId(b.course))
      .filter((id): id is string => Boolean(id) && ObjectId.isValid(id as string))
      .map((id) => new ObjectId(id))

    if (courseBlockIds.length > 0) {
      const db = await getContentDb()
      const courseDocs = await db
        .collection('courses')
        .find(
          { _id: { $in: courseBlockIds }, status: 'published', isActive: true },
          { projection: { _id: 1 } },
        )
        .toArray()
      if (courseDocs.length > 0) return true
    }
  }

  // Legacy / interim shape: items[]. Walk every item's `lesson` reference; all
  // lessons must resolve. This is the load-bearing check for products that
  // pre-date the contents[] migration (most of the CMS today).
  const items = product.items
  if (!Array.isArray(items) || items.length === 0) return false

  const lessonIds: string[] = []
  for (const item of items) {
    const id = itemLessonId(item)
    if (id && ObjectId.isValid(id)) lessonIds.push(id)
  }

  if (lessonIds.length === 0) return false

  const lessons = await Promise.all(
    lessonIds.map((id) => findByIdSerialized<Lesson>('lessons', id)),
  )

  // Every item's lesson must exist. Any dangling reference drops the product.
  return lessons.every((lesson) => lesson !== null)
}

export const queryActiveProducts = cache(async (): Promise<Product[]> => {
  const products = await findManySerialized<Product>(
    'products',
    { isActive: true },
    { sort: { createdAt: 1 }, limit: 100 },
  )

  const filtered: (Product | null)[] = await Promise.all(
    products.map(async (product): Promise<Product | null> => {
      const valid = await hasValidCourseLinkage(product)
      if (!valid) return null
      const populatedCourse = await populateCourseField(product.course)
      return { ...product, course: populatedCourse ?? product.course ?? null }
    }),
  )

  return filtered.filter((product): product is Product => product !== null).map(normalizeProduct)
})

/**
 * Walks a product's `contents` blocks, collects all referenced course + feature
 * IDs, fetches them in two batched queries, then re-attaches the populated
 * docs onto each block. Equivalent of Payload's depth=2 join — needed because
 * web reads Mongo directly without the Payload runtime.
 */
async function populateContents(
  contents: ProductContentBlock[] | null | undefined,
): Promise<ProductContentBlock[] | null> {
  if (!contents || contents.length === 0) return contents ?? null

  // Collect bare ids only — if a block is already populated upstream, skip it
  // both here (so we don't dispatch a wasted Mongo query) and below (so we
  // don't overwrite a richer object with our narrow projection). The
  // "is populated" predicate is shared with the client renderer via
  // src/infra/types/content.ts so they can never disagree.
  const courseIds: ObjectId[] = []
  const featureIds: ObjectId[] = []
  for (const block of contents) {
    if (block.blockType === 'courseBlock' && !isPopulatedCourseRef(block.course)) {
      const id = relationId(block.course)
      if (id && ObjectId.isValid(id)) courseIds.push(new ObjectId(id))
    } else if (block.blockType === 'featureBlock' && !isPopulatedFeatureRef(block.feature)) {
      const id = relationId(block.feature)
      if (id && ObjectId.isValid(id)) featureIds.push(new ObjectId(id))
    }
  }

  if (courseIds.length === 0 && featureIds.length === 0) return contents

  const db = await getContentDb()
  const [courseDocs, featureDocs] = await Promise.all([
    courseIds.length
      ? db
          .collection('courses')
          .find({ _id: { $in: courseIds } }, { projection: { title: 1, slug: 1 } })
          .toArray()
      : Promise.resolve([] as unknown[]),
    featureIds.length
      ? db
          .collection('features')
          .find(
            { _id: { $in: featureIds } },
            { projection: { key: 1, label: 1, type: 1, isSilent: 1 } },
          )
          .toArray()
      : Promise.resolve([] as unknown[]),
  ])

  const courseById = new Map<string, ProductCourseRef>()
  for (const doc of courseDocs as Array<{ _id: unknown; title?: string; slug?: string }>) {
    const id = relationId(doc._id)
    if (id) courseById.set(id, serializeDoc<ProductCourseRef>(doc))
  }

  const featureById = new Map<string, ProductFeatureRef>()
  for (const doc of featureDocs as Array<{
    _id: unknown
    key?: string
    label?: string
    type?: string
    isSilent?: boolean
  }>) {
    const id = relationId(doc._id)
    if (id) featureById.set(id, serializeDoc<ProductFeatureRef>(doc))
  }

  return contents.map((block) => {
    if (block.blockType === 'courseBlock') {
      // Already populated upstream (e.g. a future hook or a depth>0 fetch)?
      // Keep it as-is — overwriting with our narrow projection would strip
      // any extra fields the caller put there.
      if (isPopulatedCourseRef(block.course)) return block
      const id = relationId(block.course)
      const populated = id ? courseById.get(id) : null
      return populated ? { ...block, course: populated } : block
    }
    if (block.blockType === 'featureBlock') {
      if (isPopulatedFeatureRef(block.feature)) return block
      const id = relationId(block.feature)
      const populated = id ? featureById.get(id) : null
      return populated ? { ...block, feature: populated } : block
    }
    return block
  })
}

/**
 * Resolves a bare `Product.course` id into the minimal populated shape
 * `{ id, title, slug }` that the storefront renders next to the product
 * name and as a post-purchase redirect target. Mirrors the populateContents
 * pattern (skip if already populated). Returns `null` when there's no course
 * to populate or when the underlying course has been deleted.
 */
async function populateCourseField(course: Product['course']): Promise<ProductCourseRef | null> {
  if (!course) return null
  if (isPopulatedCourseRef(course)) return course
  const id = relationId(course)
  if (!id) return null
  const db = await getContentDb()
  const doc = ObjectId.isValid(id)
    ? await db
        .collection('courses')
        .findOne({ _id: new ObjectId(id) }, { projection: { title: 1, slug: 1 } })
    : null
  return doc ? serializeDoc<ProductCourseRef>(doc) : null
}

export const queryProductBySlug = cache(
  async ({ slug }: { slug: string }): Promise<Product | null> => {
    const product = await findOneSerialized<Product>('products', { slug, isActive: true })
    if (!product) return null
    const populatedContents = await populateContents(product.contents)
    const populatedCourse = await populateCourseField(product.course)
    return normalizeProduct({
      ...product,
      contents: populatedContents,
      course: populatedCourse ?? product.course ?? null,
    })
  },
)

export const queryAllProductSlugs = cache(async (): Promise<{ slug: string }[]> => {
  const products = await findManySerialized<Product>(
    'products',
    { isActive: true },
    { projection: { slug: 1 }, limit: 1000 },
  )
  return products
    .filter((product) => product.slug)
    .map((product) => ({ slug: product.slug as string }))
})
