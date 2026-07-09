// @vitest-environment node

/**
 * Regression test for issue #735: courses created before tenant isolation
 * (no `tenant` field) must still surface on public course routes when a
 * `DEFAULT_TENANT_SLUG` is configured.
 *
 * Background: When the Payload admin runtime was removed, public course
 * queries were migrated to `defaultTenantFilter()`, which only matched
 * documents whose `tenant` equaled the default tenant's id. Legacy
 * documents (and any document authored without a tenant) became invisible,
 * surfacing as 404s on /courses, /chapters, and /lessons.
 *
 * This test pins the contract: courses with a matching tenant, courses
 * with a different tenant, courses with `tenant: null`, and courses with
 * no `tenant` field must each behave as the public routes expect.
 */
import { ObjectId, type Db } from 'mongodb'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getContentDb, resetDefaultTenantFilterCache } from '@/server/repos/mongo'
import { queryCourseBySlug, queryPublishedCourses } from '@/server/repos/queries/courses'
import { startMongoContainer, stopMongoContainer } from '@/infra/utils/test/mongodb-container'

const TEST_TENANT_SLUG = `courses-tenant-legacy-${Date.now()}`
const OTHER_TENANT_SLUG = `courses-tenant-other-${Date.now()}`

let db: Db | undefined
let originalDatabaseUrl: string | undefined
let originalDefaultTenantSlug: string | undefined
let testTenantId: ObjectId
let otherTenantId: ObjectId
const timestamp = Date.now()

const defaultTenantCourseSlug = `default-tenant-course-${timestamp}`
const nullTenantCourseSlug = `null-tenant-course-${timestamp}`
const missingTenantCourseSlug = `missing-tenant-course-${timestamp}`
const otherTenantCourseSlug = `other-tenant-course-${timestamp}`
const draftCourseSlug = `draft-course-${timestamp}`

let defaultTenantCourseId: ObjectId
let nullTenantCourseId: ObjectId
let missingTenantCourseId: ObjectId
let otherTenantCourseId: ObjectId
let draftCourseId: ObjectId

beforeAll(async () => {
  originalDatabaseUrl = process.env.DATABASE_URL
  originalDefaultTenantSlug = process.env.DEFAULT_TENANT_SLUG

  const existingClient = await globalThis.__aguyMongoClientPromise
  await existingClient?.close()
  globalThis.__aguyMongoClientPromise = undefined

  const mongoUri = await startMongoContainer()
  process.env.DATABASE_URL = mongoUri
  process.env.DEFAULT_TENANT_SLUG = TEST_TENANT_SLUG
  resetDefaultTenantFilterCache()

  db = await getContentDb()

  testTenantId = new ObjectId()
  otherTenantId = new ObjectId()

  await db.collection('tenants').insertMany([
    { _id: testTenantId, name: TEST_TENANT_SLUG, slug: TEST_TENANT_SLUG, status: 'active' },
    { _id: otherTenantId, name: OTHER_TENANT_SLUG, slug: OTHER_TENANT_SLUG, status: 'active' },
  ])

  defaultTenantCourseId = new ObjectId()
  nullTenantCourseId = new ObjectId()
  missingTenantCourseId = new ObjectId()
  otherTenantCourseId = new ObjectId()
  draftCourseId = new ObjectId()

  await db.collection('courses').insertMany([
    {
      _id: defaultTenantCourseId,
      courseLabel: `DT-${timestamp}`,
      title: `Default Tenant Course ${timestamp}`,
      slug: defaultTenantCourseSlug,
      status: 'published',
      isActive: true,
      tenant: testTenantId,
      accessType: 'free',
      contentStatus: 'none',
      contentStatusVisible: true,
      order: 0,
    },
    {
      _id: nullTenantCourseId,
      courseLabel: `NT-${timestamp}`,
      title: `Null Tenant Course ${timestamp}`,
      slug: nullTenantCourseSlug,
      status: 'published',
      isActive: true,
      tenant: null,
      accessType: 'free',
      contentStatus: 'none',
      contentStatusVisible: true,
      order: 1,
    },
    {
      _id: missingTenantCourseId,
      courseLabel: `MT-${timestamp}`,
      title: `Missing Tenant Course ${timestamp}`,
      slug: missingTenantCourseSlug,
      status: 'published',
      isActive: true,
      accessType: 'free',
      contentStatus: 'none',
      contentStatusVisible: true,
      order: 2,
    },
    {
      _id: otherTenantCourseId,
      courseLabel: `OT-${timestamp}`,
      title: `Other Tenant Course ${timestamp}`,
      slug: otherTenantCourseSlug,
      status: 'published',
      isActive: true,
      tenant: otherTenantId,
      accessType: 'free',
      contentStatus: 'none',
      contentStatusVisible: true,
      order: 3,
    },
    {
      _id: draftCourseId,
      courseLabel: `DR-${timestamp}`,
      title: `Draft Course ${timestamp}`,
      slug: draftCourseSlug,
      status: 'draft',
      isActive: true,
      tenant: testTenantId,
      accessType: 'free',
      contentStatus: 'none',
      contentStatusVisible: true,
      order: 4,
    },
  ])
}, 120_000)

afterAll(async () => {
  await db?.collection('courses').deleteMany({
    _id: {
      $in: [
        defaultTenantCourseId,
        nullTenantCourseId,
        missingTenantCourseId,
        otherTenantCourseId,
        draftCourseId,
      ],
    },
  })
  await db?.collection('tenants').deleteMany({
    slug: { $in: [TEST_TENANT_SLUG, OTHER_TENANT_SLUG] },
  })

  const client = await globalThis.__aguyMongoClientPromise
  await client?.close()
  globalThis.__aguyMongoClientPromise = undefined

  await stopMongoContainer()
  resetDefaultTenantFilterCache()

  if (originalDatabaseUrl !== undefined) {
    process.env.DATABASE_URL = originalDatabaseUrl
  } else {
    // @ts-expect-error: TypeScript doesn't allow delete on process.env
    delete process.env.DATABASE_URL
  }
  if (originalDefaultTenantSlug !== undefined) {
    process.env.DEFAULT_TENANT_SLUG = originalDefaultTenantSlug
  } else {
    // @ts-expect-error: TypeScript doesn't allow delete on process.env
    delete process.env.DEFAULT_TENANT_SLUG
  }
}, 120_000)

describe('defaultTenantFilter — public course routes (issue #735)', () => {
  it('queryCourseBySlug returns courses belonging to the default tenant', async () => {
    const course = await queryCourseBySlug({ slug: defaultTenantCourseSlug })
    expect(course).not.toBeNull()
    expect(course?.slug).toBe(defaultTenantCourseSlug)
  })

  it('queryCourseBySlug returns legacy courses with tenant: null', async () => {
    const course = await queryCourseBySlug({ slug: nullTenantCourseSlug })
    expect(course).not.toBeNull()
    expect(course?.slug).toBe(nullTenantCourseSlug)
  })

  it('queryCourseBySlug returns legacy courses that have no tenant field at all', async () => {
    const course = await queryCourseBySlug({ slug: missingTenantCourseSlug })
    expect(course).not.toBeNull()
    expect(course?.slug).toBe(missingTenantCourseSlug)
  })

  it('queryCourseBySlug excludes courses from other tenants', async () => {
    const course = await queryCourseBySlug({ slug: otherTenantCourseSlug })
    expect(course).toBeNull()
  })

  it('queryCourseBySlug still excludes draft courses regardless of tenant', async () => {
    const course = await queryCourseBySlug({ slug: draftCourseSlug })
    expect(course).toBeNull()
  })

  it('queryPublishedCourses includes default + legacy courses but excludes other-tenant + draft', async () => {
    const courses = await queryPublishedCourses()
    const slugs = courses.map((course) => course.slug)

    expect(slugs).toContain(defaultTenantCourseSlug)
    expect(slugs).toContain(nullTenantCourseSlug)
    expect(slugs).toContain(missingTenantCourseSlug)
    expect(slugs).not.toContain(otherTenantCourseSlug)
    expect(slugs).not.toContain(draftCourseSlug)
  })
})
