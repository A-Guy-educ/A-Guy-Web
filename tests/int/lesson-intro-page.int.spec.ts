// @vitest-environment node

/**
 * Integration tests for the LessonIntroPage feature (issue #30).
 *
 * Tests that blocks-only lessons (no exercises, no media files) return correct
 * data from queryLessonBlocks, so LessonIntroPage can display proper content
 * type indicators (content page counts).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ObjectId, type Db } from 'mongodb'
import { startMongoContainer, stopMongoContainer } from '@/infra/utils/test/mongodb-container'
import { getContentDb } from '@/server/repos/mongo'
import { queryLessonBlocks } from '@/server/repos/queries/lesson-blocks'
import { queryLessonBySlug } from '@/server/repos/queries/lessons'
import { queryExercisesByLesson } from '@/server/repos/queries/exercises'

let db: Db | undefined
let originalDatabaseUrl: string | undefined
let categoryId: string
let contentPageId: string
let courseId: string
let chapterId: string
let blocksOnlyLessonId: string
let blocksOnlyLessonSlug: string
let blocksWithContentPagesLessonId: string

const TENANT_SLUG = `lesson-intro-test-tenant-${Date.now()}`

beforeAll(async () => {
  originalDatabaseUrl = process.env.DATABASE_URL

  const existingClient = await globalThis.__aguyMongoClientPromise
  await existingClient?.close()
  globalThis.__aguyMongoClientPromise = undefined

  const mongoUri = await startMongoContainer()
  process.env.DATABASE_URL = mongoUri

  db = await getContentDb()

  const timestamp = Date.now()
  const tenantObjectId = new ObjectId()
  const categoryObjectId = new ObjectId()
  const courseObjectId = new ObjectId()
  const chapterObjectId = new ObjectId()
  const blocksOnlyLessonObjectId = new ObjectId()
  const contentPageObjectId = new ObjectId()
  const blocksWithContentPagesLessonObjectId = new ObjectId()

  courseId = courseObjectId.toString()
  chapterId = chapterObjectId.toString()
  categoryId = categoryObjectId.toString()
  contentPageId = contentPageObjectId.toString()
  blocksOnlyLessonId = blocksOnlyLessonObjectId.toString()
  blocksOnlyLessonSlug = `blocks-only-lesson-${timestamp}`
  blocksWithContentPagesLessonId = blocksWithContentPagesLessonObjectId.toString()

  await db.collection('tenants').insertOne({
    _id: tenantObjectId,
    name: TENANT_SLUG,
    slug: TENANT_SLUG,
    status: 'active',
  })

  await db.collection('categories').insertOne({
    _id: categoryObjectId,
    title: `LessonIntro Test Category ${timestamp}`,
    slug: `lesson-intro-cat-${timestamp}`,
    locale: 'he',
  })

  await db.collection('courses').insertOne({
    _id: courseObjectId,
    courseLabel: `LI-${timestamp}`,
    title: `LessonIntro Test Course ${timestamp}`,
    slug: `lesson-intro-course-${timestamp}`,
    status: 'published',
    categories: [categoryObjectId],
    tenant: tenantObjectId,
    pageAccessType: 'free',
    accessType: 'free',
    contentStatus: 'none',
    contentStatusVisible: true,
    isActive: true,
  })

  await db.collection('chapters').insertOne({
    _id: chapterObjectId,
    title: `LessonIntro Test Chapter ${timestamp}`,
    chapterLabel: `LI-${timestamp}`,
    course: courseObjectId,
    order: 0,
    status: 'published',
    isActive: true,
    tenant: tenantObjectId,
    locale: 'he',
  })

  // Lesson 1: blocks-only (no exercises, no media) — EmptyLessonPlaceholder path
  await db.collection('lessons').insertOne({
    _id: blocksOnlyLessonObjectId,
    title: `Blocks Only Lesson ${timestamp}`,
    slug: blocksOnlyLessonSlug,
    chapter: chapterObjectId,
    type: 'learning',
    order: 1,
    status: 'published',
    isActive: true,
    tenant: tenantObjectId,
    locale: 'he',
    accessType: 'inherit',
    contentStatus: 'none',
    contentStatusVisible: true,
    contentFiles: [],
  })

  // Lesson 2: lesson with content pages in blocks
  await db.collection('content-pages').insertOne({
    _id: contentPageObjectId,
    title: `Test Content Page ${timestamp}`,
    slug: `test-content-page-${timestamp}`,
    status: 'published',
    isActive: true,
    body: '<p>Test content</p>',
    tenant: tenantObjectId,
    locale: 'he',
  })

  await db.collection('lessons').insertOne({
    _id: blocksWithContentPagesLessonObjectId,
    title: `Blocks With Content Pages ${timestamp}`,
    slug: `blocks-with-content-pages-${timestamp}`,
    chapter: chapterObjectId,
    type: 'learning',
    order: 2,
    status: 'published',
    isActive: true,
    tenant: tenantObjectId,
    locale: 'he',
    accessType: 'inherit',
    contentStatus: 'none',
    contentStatusVisible: true,
    blocks: [{ blockType: 'contentPageRef', contentPage: contentPageObjectId }],
  })
}, 120_000)

afterAll(async () => {
  await db?.collection('lessons').deleteMany({
    _id: {
      $in: [blocksOnlyLessonId, blocksWithContentPagesLessonId].map((id) => new ObjectId(id)),
    },
  })
  await db?.collection('content-pages').deleteOne({ _id: new ObjectId(contentPageId) })
  await db?.collection('chapters').deleteOne({ _id: new ObjectId(chapterId) })
  await db?.collection('courses').deleteOne({ _id: new ObjectId(courseId) })
  await db?.collection('categories').deleteOne({ _id: new ObjectId(categoryId) })
  await db?.collection('tenants').deleteOne({ slug: TENANT_SLUG })

  const client = await globalThis.__aguyMongoClientPromise
  await client?.close()
  globalThis.__aguyMongoClientPromise = undefined

  await stopMongoContainer()

  if (originalDatabaseUrl !== undefined) {
    process.env.DATABASE_URL = originalDatabaseUrl
  } else {
    // @ts-expect-error: TypeScript doesn't allow delete on process.env
    delete process.env.DATABASE_URL
  }
}, 120_000)

describe('LessonIntroPage data layer', () => {
  it('queryLessonBlocks returns empty array for blocks-only lesson with no exercises and no blocks', async () => {
    const blocks = await queryLessonBlocks({ lessonId: blocksOnlyLessonId })
    expect(blocks).toEqual([])
  })

  it('queryLessonBlocks returns content page blocks when lesson has contentPageRef blocks', async () => {
    const blocks = await queryLessonBlocks({ lessonId: blocksWithContentPagesLessonId })
    expect(blocks.length).toBeGreaterThan(0)
    expect(blocks[0].type).toBe('contentPage')
  })

  it('queryExercisesByLesson returns empty array for blocks-only lesson', async () => {
    const exercises = await queryExercisesByLesson({ lessonId: blocksOnlyLessonId })
    expect(exercises).toHaveLength(0)
  })

  it('queryLessonBySlug returns the lesson with no exercises and no media', async () => {
    const lesson = await queryLessonBySlug({ slug: blocksOnlyLessonSlug })
    expect(lesson).not.toBeNull()
    expect(lesson?.id).toBe(blocksOnlyLessonId)
    expect(lesson?.title).toContain('Blocks Only Lesson')
    // contentFiles should be empty or null
    expect(lesson?.contentFiles ?? []).toHaveLength(0)
  })

  it('hasExerciseBlocks is false and mediaFiles is empty for blocks-only lesson — triggers LessonIntroPage path', async () => {
    // This simulates the logic in page.tsx:
    // hasExerciseBlocks = exercises.some(hasBlocks) → false (exercises is empty)
    // mediaFiles.length = 0
    // → renders LessonIntroPage (not ExercisesPager or PdfLessonPager)
    const lesson = await queryLessonBySlug({ slug: blocksOnlyLessonSlug })
    const exercises = await queryExercisesByLesson({ lessonId: blocksOnlyLessonId })
    const blocks = await queryLessonBlocks({ lessonId: blocksOnlyLessonId })

    const hasExerciseBlocks = exercises.some((e) => {
      if (Array.isArray(e.content)) return e.content.length > 0
      if (e.content && typeof e.content === 'object' && 'blocks' in e.content) {
        return (
          Array.isArray((e.content as { blocks?: unknown[] }).blocks) &&
          (e.content as { blocks: unknown[] }).blocks.length > 0
        )
      }
      return false
    })

    const contentFiles = (lesson?.contentFiles ?? []) as unknown[]
    const mediaFiles = contentFiles.filter(
      (f): f is { url?: string | null; filename?: string } =>
        typeof f === 'object' &&
        Boolean(f) &&
        Boolean((f as { url?: string }).url || (f as { filename?: string }).filename),
    )

    // This combination triggers the LessonIntroPage path in page.tsx
    expect(hasExerciseBlocks).toBe(false)
    expect(mediaFiles).toHaveLength(0)
    // LessonIntroPage receives blocks from queryLessonBlocks
    expect(blocks).toEqual([])
  })
})
