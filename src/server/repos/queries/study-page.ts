import { cache } from 'react'

import type { Chapter, ContentLocale, Lesson } from '@/infra/types/content'
import { DEFAULT_ACCESS_TYPE, DEFAULT_PAGE_ACCESS_TYPE } from '@/server/constants/access-types'
import { SystemParams } from '@/infra/config/system-params'
import {
  findManySerialized,
  localeFilter,
  objectIdFromString,
  relationId,
  visibleContentFilter,
  andFilter,
} from '../mongo'
import { queryChaptersByCourse, queryChaptersByGrade } from './chapters'

export interface PrefetchedStudyData {
  chapters: Array<Chapter & { lessons: Lesson[] }>
  courseSlug: string
  courseId: string
  courseTitle: string
  courseLabel: string
  coursePageAccessType: string
  courseAccessType: string
  gatedDelayMs?: number
  gatedWarningMs?: number
}

export const prefetchStudyData = cache(
  async (
    gradeLevel: string,
    locale?: ContentLocale,
    lessonType: 'learning' | 'practice' | 'exam' = 'practice',
    courseId?: string,
  ): Promise<PrefetchedStudyData | null> => {
    const [chapters, [gatedDelayMs, gatedWarningMs]] = await Promise.all([
      courseId ? queryChaptersByCourse({ courseId }) : queryChaptersByGrade({ gradeLevel, locale }),
      Promise.all([SystemParams.getGatedDelayMs(), SystemParams.getGatedWarningMs()]),
    ])

    const course = typeof chapters[0]?.course === 'object' ? chapters[0].course : null
    if (!course) return null

    const chapterIds = chapters.map((chapter) => chapter.id)
    const lessons =
      chapterIds.length > 0
        ? await findManySerialized<Lesson>(
            'lessons',
            andFilter(
              visibleContentFilter({
                chapter: { $in: chapterIds.map(objectIdFromString) },
                type: lessonType,
              }),
              localeFilter(locale),
            ),
            { sort: { order: 1 }, limit: 1000 },
          )
        : []

    const lessonsByChapter: Record<string, Lesson[]> = {}
    for (const lesson of lessons) {
      const chapterId = relationId(lesson.chapter)
      if (!chapterId) continue
      lessonsByChapter[chapterId] ||= []
      lessonsByChapter[chapterId].push(lesson)
    }

    return {
      chapters: chapters.map((chapter) => ({
        ...chapter,
        lessons: lessonsByChapter[chapter.id] || [],
      })),
      courseSlug: course.slug || '',
      courseId: course.id,
      courseTitle: course.title || '',
      courseLabel: course.courseLabel || '',
      coursePageAccessType: course.pageAccessType || DEFAULT_PAGE_ACCESS_TYPE,
      courseAccessType: course.accessType || DEFAULT_ACCESS_TYPE,
      gatedDelayMs,
      gatedWarningMs,
    }
  },
)
