// @vitest-environment node

/**
 * @fileType unit-test
 * @domain lessons
 * @pattern page-routing, lenient-lookup
 * @ai-summary Regression tests for QA issue #714 F1: the lesson start page
 *             must render even when the URL's course/chapter slug does not
 *             match the lesson's actual chapter/course. Previously, the
 *             getLessonData guards returned null in that case and the page
 *             rendered "Lesson Not Found" for every public, published lesson.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryCourseBySlugWithFallbackMock = vi.fn()
const queryLessonBySlugMock = vi.fn()
const queryLessonBlocksMock = vi.fn()
const getSystemLocaleMock = vi.fn()

vi.mock('@/i18n/server-locale', () => ({
  getSystemLocale: () => getSystemLocaleMock(),
}))

vi.mock('@/server/repos/queries/courses', () => ({
  queryCourseBySlugWithFallback: (args: unknown) => queryCourseBySlugWithFallbackMock(args),
}))

vi.mock('@/server/repos/queries/lessons', () => ({
  queryLessonBySlug: (args: unknown) => queryLessonBySlugMock(args),
}))

vi.mock('@/server/repos/queries/lesson-blocks', () => ({
  queryLessonBlocks: (args: unknown) => queryLessonBlocksMock(args),
}))

vi.mock('@/infra/config/server-init', () => ({}))

describe('getLessonData — F1 fix (QA issue #714)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSystemLocaleMock.mockResolvedValue('he')
    queryLessonBlocksMock.mockResolvedValue([])
  })

  it('returns lesson data when URL course/chapter slugs match the lesson', async () => {
    // Normal case: lesson's chapter.slug === chapterSlug and chapter.course.id === course.id.
    queryCourseBySlugWithFallbackMock.mockResolvedValue({
      course: { id: 'course-1', slug: 'math-101', accessType: 'free', courseLabel: 'g7' },
      isLocaleFallback: false,
    })
    queryLessonBySlugMock.mockResolvedValue({
      id: 'lesson-1',
      title: 'Intro Lesson',
      slug: 'intro-lesson',
      chapter: {
        id: 'chapter-1',
        slug: 'chapter-1',
        course: { id: 'course-1', slug: 'math-101', accessType: 'free', courseLabel: 'g7' },
      },
    })

    const { getLessonData } =
      await import('@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/page')

    const result = await getLessonData({
      courseSlug: 'math-101',
      chapterSlug: 'chapter-1',
      lessonSlug: 'intro-lesson',
    })

    expect(result).not.toBeNull()
    expect(result?.lesson.id).toBe('lesson-1')
    expect(result?.course.id).toBe('course-1')
    expect(result?.chapter.slug).toBe('chapter-1')
  })

  it('returns lesson data when URL course/chapter slugs DO NOT match the lesson (F1 fix)', async () => {
    // F1 repro: the URL says course-slug=import-and-export / chapter-slug=importexport-chapter,
    // but the lesson actually belongs to course-X / chapter-Y. Previously this
    // caused getLessonData to return null and the page rendered "Lesson Not Found".
    // After the fix, the lesson's chapter/course (populated by populateLesson) is
    // the source of truth — the URL slugs are routing hints only.
    queryCourseBySlugWithFallbackMock.mockResolvedValue({
      course: {
        id: 'course-url',
        slug: 'import-and-export',
        accessType: 'free',
        courseLabel: 'g7',
      },
      isLocaleFallback: false,
    })
    queryLessonBySlugMock.mockResolvedValue({
      id: 'lesson-1',
      title: 'Impexp1',
      slug: 'impexp1',
      chapter: {
        id: 'chapter-real',
        slug: 'chapter-real',
        course: {
          id: 'course-real',
          slug: 'real-course-slug',
          accessType: 'free',
          courseLabel: 'g7',
        },
      },
    })

    const { getLessonData } =
      await import('@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/page')

    const result = await getLessonData({
      courseSlug: 'import-and-export',
      chapterSlug: 'importexport-chapter',
      lessonSlug: 'impexp1',
    })

    // The lesson must render — that is the F1 fix.
    expect(result).not.toBeNull()
    expect(result?.lesson.id).toBe('lesson-1')
    // And the lesson's actual course (not the URL-fetched one) must be used.
    expect(result?.course.id).toBe('course-real')
    expect(result?.course.slug).toBe('real-course-slug')
    expect(result?.chapter.slug).toBe('chapter-real')
  })

  it('returns lesson data when the URL course slug does not exist at all', async () => {
    // The URL points at a course slug that has no document in the DB. The
    // URL-fetched course is null, but the lesson's chapter.course is populated
    // (the lesson belongs to a real course). The page must still render.
    queryCourseBySlugWithFallbackMock.mockResolvedValue({
      course: null,
      isLocaleFallback: false,
    })
    queryLessonBySlugMock.mockResolvedValue({
      id: 'lesson-1',
      title: 'Impexp1',
      slug: 'impexp1',
      chapter: {
        id: 'chapter-real',
        slug: 'chapter-real',
        course: {
          id: 'course-real',
          slug: 'real-course-slug',
          accessType: 'free',
          courseLabel: 'g7',
        },
      },
    })

    const { getLessonData } =
      await import('@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/page')

    const result = await getLessonData({
      courseSlug: 'totally-wrong-slug',
      chapterSlug: 'totally-wrong-chapter',
      lessonSlug: 'impexp1',
    })

    expect(result).not.toBeNull()
    expect(result?.lesson.id).toBe('lesson-1')
    expect(result?.course.id).toBe('course-real')
  })

  it('returns lesson data when the chapter course field is just a string ID (course deleted)', async () => {
    // Defensive fallback: if the chapter.course field is a bare ID string
    // (the course document was deleted), fall back to the URL-fetched course.
    queryCourseBySlugWithFallbackMock.mockResolvedValue({
      course: { id: 'course-url', slug: 'url-slug', accessType: 'free', courseLabel: 'g7' },
      isLocaleFallback: false,
    })
    queryLessonBySlugMock.mockResolvedValue({
      id: 'lesson-1',
      title: 'Lesson',
      slug: 'lesson-slug',
      chapter: {
        id: 'chapter-1',
        slug: 'chapter-1',
        // Bare string — the course document was deleted from the DB.
        course: 'course-deleted-id',
      },
    })

    const { getLessonData } =
      await import('@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/page')

    const result = await getLessonData({
      courseSlug: 'url-slug',
      chapterSlug: 'chapter-1',
      lessonSlug: 'lesson-slug',
    })

    expect(result).not.toBeNull()
    expect(result?.lesson.id).toBe('lesson-1')
    // Falls back to the URL-fetched course.
    expect(result?.course.id).toBe('course-url')
  })

  it('returns null when the lesson itself does not exist', async () => {
    // The only case that should return null: the lesson slug is not findable.
    // This is the only gate the public page enforces — not the URL course/chapter.
    queryCourseBySlugWithFallbackMock.mockResolvedValue({
      course: { id: 'course-1', slug: 'math-101', accessType: 'free' },
      isLocaleFallback: false,
    })
    queryLessonBySlugMock.mockResolvedValue(null)

    const { getLessonData } =
      await import('@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/page')

    const result = await getLessonData({
      courseSlug: 'math-101',
      chapterSlug: 'chapter-1',
      lessonSlug: 'does-not-exist',
    })

    expect(result).toBeNull()
  })

  it('returns null when the lesson exists but has no chapter', async () => {
    // Defensive: a malformed lesson without a chapter cannot render.
    queryCourseBySlugWithFallbackMock.mockResolvedValue({
      course: { id: 'course-1', slug: 'math-101', accessType: 'free' },
      isLocaleFallback: false,
    })
    queryLessonBySlugMock.mockResolvedValue({
      id: 'lesson-orphan',
      title: 'Orphan Lesson',
      slug: 'orphan-lesson',
      chapter: null,
    })

    const { getLessonData } =
      await import('@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/page')

    const result = await getLessonData({
      courseSlug: 'math-101',
      chapterSlug: 'chapter-1',
      lessonSlug: 'orphan-lesson',
    })

    expect(result).toBeNull()
  })

  it('returns null when neither the chapter.course nor the URL course resolves', async () => {
    // Last-resort guard: if both the chapter.course field and the URL course
    // lookup return nothing, the page cannot render course-level data.
    queryCourseBySlugWithFallbackMock.mockResolvedValue({
      course: null,
      isLocaleFallback: false,
    })
    queryLessonBySlugMock.mockResolvedValue({
      id: 'lesson-1',
      title: 'Lesson',
      slug: 'lesson-slug',
      chapter: {
        id: 'chapter-1',
        slug: 'chapter-1',
        // Bare string — no course document in DB.
        course: 'course-deleted-id',
      },
    })

    const { getLessonData } =
      await import('@/app/(frontend)/courses/[courseSlug]/chapters/[chapterSlug]/lessons/[lessonSlug]/page')

    const result = await getLessonData({
      courseSlug: 'totally-wrong-slug',
      chapterSlug: 'chapter-1',
      lessonSlug: 'lesson-slug',
    })

    expect(result).toBeNull()
  })
})
