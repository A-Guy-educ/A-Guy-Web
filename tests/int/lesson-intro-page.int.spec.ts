// Node.js environment required: payload.login() uses jose JWT signing which depends on
// Node.js's native TextEncoder/Uint8Array. The jsdom environment can cause a
// Uint8Array realm mismatch that breaks jose's FlattenedSign constructor check.

/**
 * Integration tests for the LessonIntroPage feature (issue #30).
 *
 * Tests that blocks-only lessons (no exercises, no media files) return correct
 * data from queryLessonBlocks, so LessonIntroPage can display proper content
 * type indicators (content page counts).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import { startMongoContainer, stopMongoContainer } from '@/infra/utils/test/mongodb-container'
import { queryLessonBlocks } from '@/server/repos/queries/lesson-blocks'
import { queryLessonBySlug } from '@/server/repos/queries/lessons'
import { queryExercisesByLesson } from '@/server/repos/queries/exercises'

let payload: Payload
let originalDatabaseUrl: string | undefined
let courseId: string
let chapterId: string
let blocksOnlyLessonId: string
let blocksOnlyLessonSlug: string
let blocksWithContentPagesLessonId: string

const TENANT_SLUG = `lesson-intro-test-tenant-${Date.now()}`

async function ensureDefaultTenant(payload: Payload): Promise<string> {
  const existing = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: TENANT_SLUG } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs[0]) {
    return existing.docs[0].id
  }

  const created = await payload.create({
    collection: 'tenants',
    data: { name: TENANT_SLUG, slug: TENANT_SLUG, status: 'active' },
    overrideAccess: true,
  })

  return created.id
}

beforeAll(async () => {
  originalDatabaseUrl = process.env.DATABASE_URL

  // @ts-expect-error: TypeScript doesn't allow delete on process.env
  delete process.env.DATABASE_URL

  const mongoUri = await startMongoContainer()
  process.env.DATABASE_URL = mongoUri

  const config = await import('@payload-config')
  payload = await getPayload({ config: config.default })

  const tenantId = await ensureDefaultTenant(payload)
  const timestamp = Date.now()

  const category = await payload.create({
    collection: 'categories',
    data: {
      title: `LessonIntro Test Category ${timestamp}`,
      slug: `lesson-intro-cat-${timestamp}`,
      locale: 'he',
    },
    overrideAccess: true,
  })

  const course = await payload.create({
    collection: 'courses',
    data: {
      courseLabel: `LI-${timestamp}`,
      title: `LessonIntro Test Course ${timestamp}`,
      slug: `lesson-intro-course-${timestamp}`,
      status: 'published',
      categories: [category.id],
      tenant: tenantId,
      pageAccessType: 'free',
      accessType: 'free',
      contentStatus: 'none',
      contentStatusVisible: true,
      isActive: true,
    },
    draft: false,
  })
  courseId = course.id

  const chapter = await payload.create({
    collection: 'chapters',
    data: {
      title: `LessonIntro Test Chapter ${timestamp}`,
      chapterLabel: `LI-${timestamp}`,
      course: courseId,
      order: 0,
      status: 'published',
      isActive: true,
      tenant: tenantId,
      locale: 'he',
    },
    overrideAccess: true,
  })
  chapterId = chapter.id

  // Lesson 1: blocks-only (no exercises, no media) — EmptyLessonPlaceholder path
  const blocksOnlyLesson = await payload.create({
    collection: 'lessons',
    data: {
      title: `Blocks Only Lesson ${timestamp}`,
      slug: `blocks-only-lesson-${timestamp}`,
      chapter: chapterId,
      type: 'learning',
      order: 1,
      status: 'published',
      isActive: true,
      tenant: tenantId,
      locale: 'he',
      accessType: 'inherit',
      contentStatus: 'none',
      contentStatusVisible: true,
      // No exercises field — exercises are stored in separate collection
      // No contentFiles — no media/PDF files
    },
    draft: false,
  })
  blocksOnlyLessonId = blocksOnlyLesson.id
  blocksOnlyLessonSlug = blocksOnlyLesson.slug as string

  // Lesson 2: lesson with content pages in blocks
  const contentPage = await payload.create({
    collection: 'contentPages',
    data: {
      title: `Test Content Page ${timestamp}`,
      slug: `test-content-page-${timestamp}`,
      status: 'published',
      body: '<p>Test content</p>',
      tenant: tenantId,
      locale: 'he',
    },
    draft: false,
  })

  const blocksWithContentPagesLesson = await payload.create({
    collection: 'lessons',
    data: {
      title: `Blocks With Content Pages ${timestamp}`,
      slug: `blocks-with-content-pages-${timestamp}`,
      chapter: chapterId,
      type: 'learning',
      order: 2,
      status: 'published',
      isActive: true,
      tenant: tenantId,
      locale: 'he',
      accessType: 'inherit',
      contentStatus: 'none',
      contentStatusVisible: true,
      blocks: [{ blockType: 'contentPageRef', contentPage: contentPage.id }],
    },
    draft: false,
  })
  blocksWithContentPagesLessonId = blocksWithContentPagesLesson.id
}, 120_000)

afterAll(async () => {
  if (payload?.db?.destroy) await payload.db.destroy()
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
