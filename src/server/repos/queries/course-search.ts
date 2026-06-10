import { cache } from 'react'

import type { Course, Exercise, Lesson } from '@/infra/types/content'
import { buildExerciseUrl, buildLessonUrl } from '@/server/utils/course-url-builder'
import { andFilter, defaultTenantFilter, findManySerialized, visibleContentFilter } from '../mongo'

export interface SearchResult {
  id: string
  title: string
  subtitle: string
  url: string
  type: 'course' | 'lesson' | 'exercise'
}

export const searchCourseContent = cache(
  async ({ query, limit = 20 }: { query: string; limit?: number }): Promise<SearchResult[]> => {
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const results: SearchResult[] = []

    const courses = await findManySerialized<Course>(
      'courses',
      andFilter(visibleContentFilter({ title: regex }), await defaultTenantFilter()),
      { limit: 10 },
    )
    for (const course of courses) {
      if (course.slug) {
        results.push({
          id: course.id,
          title: course.title,
          subtitle: '',
          url: `/courses/${course.slug}`,
          type: 'course',
        })
      }
    }

    const lessons = await findManySerialized<Lesson>(
      'lessons',
      visibleContentFilter({ title: regex }),
      {
        limit,
      },
    )
    for (const lesson of lessons) {
      const chapter = typeof lesson.chapter === 'object' ? lesson.chapter : null
      const course = chapter && typeof chapter.course === 'object' ? chapter.course : null
      if (course?.slug && chapter?.slug && lesson.slug) {
        results.push({
          id: lesson.id,
          title: lesson.title,
          subtitle: course.title ?? '',
          url: buildLessonUrl(course.slug, chapter.slug, lesson.slug),
          type: 'lesson',
        })
      }
    }

    const exercises = await findManySerialized<Exercise>('exercises', { title: regex }, { limit })
    for (const exercise of exercises) {
      const lesson = typeof exercise.lesson === 'object' ? exercise.lesson : null
      const chapter = lesson && typeof lesson.chapter === 'object' ? lesson.chapter : null
      const course = chapter && typeof chapter.course === 'object' ? chapter.course : null
      if (course?.slug && chapter?.slug && lesson?.slug && exercise.slug) {
        results.push({
          id: exercise.id,
          title: exercise.title || 'Untitled Exercise',
          subtitle: lesson.title ?? '',
          url: buildExerciseUrl(course.slug, chapter.slug, lesson.slug, exercise.slug),
          type: 'exercise',
        })
      }
    }

    return results.slice(0, limit)
  },
)
