import { cache } from 'react'

import type { Chapter, ContentLocale, Course } from '@/infra/types/content'
import {
  andFilter,
  defaultTenantFilter,
  findByIdSerialized,
  findManySerialized,
  findOneSerialized,
  localeFilter,
  objectIdFromString,
  relationId,
  publishedActiveFilter,
} from '../mongo'

async function withCourse(chapter: Chapter): Promise<Chapter> {
  const courseId = relationId(chapter.course)
  if (!courseId) return chapter
  const course = await findByIdSerialized<Course>('courses', courseId)
  return { ...chapter, course: course ?? courseId }
}

export const queryChaptersByCourse = cache(async ({ courseId }: { courseId: string }) => {
  const course = await findByIdSerialized<Course>('courses', courseId)
  if (!course || course.status !== 'published' || !course.isActive) return []

  const chapters = await findManySerialized<Chapter>(
    'chapters',
    publishedActiveFilter({ course: objectIdFromString(courseId) }),
    { sort: { order: 1 } },
  )

  return chapters.map((chapter) => ({ ...chapter, course }))
})

export const queryChapterBySlug = cache(async ({ slug }: { slug: string }) => {
  const chapter = await findOneSerialized<Chapter>('chapters', publishedActiveFilter({ slug }))
  if (!chapter) return null

  const populated = await withCourse(chapter)
  const course = typeof populated.course === 'object' ? populated.course : null
  if (!course || course.status !== 'published' || !course.isActive) return null

  return populated
})

export const queryChaptersByGrade = cache(
  async ({ gradeLevel, locale }: { gradeLevel: string; locale?: ContentLocale }) => {
    const course = await findOneSerialized<Course>(
      'courses',
      andFilter(
        publishedActiveFilter({ courseLabel: gradeLevel }),
        localeFilter(locale),
        await defaultTenantFilter(),
      ),
    )
    if (!course) return []

    return queryChaptersByCourse({ courseId: course.id })
  },
)
