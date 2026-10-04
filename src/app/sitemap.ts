import type { MetadataRoute } from 'next'

import { getBrand } from '@/brands'
import { resolveAccessType } from '@/infra/auth/access-types'
import { queryPublishedCourses } from '@/server/repos/queries/courses'
import { queryLessonsByCourse } from '@/server/repos/queries/lessons'

// Regenerate hourly. Course/chapter/lesson additions aren't typically same-hour-urgent;
// cached XML keeps crawler fetches cheap.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = getBrand().config.host.replace(/\/$/, '')
  const now = new Date()

  const entries: MetadataRoute.Sitemap = [
    { url: `${host}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${host}/courses`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
  ]

  const courses = await queryPublishedCourses()

  // Fan out lesson queries per course in parallel — they're independent reads.
  const perCourse = await Promise.all(
    courses.map(async (course) => {
      if (!course.slug) return [] as MetadataRoute.Sitemap
      const courseEntry: MetadataRoute.Sitemap[number] = {
        url: `${host}/courses/${course.slug}`,
        lastModified: parseDate(readUpdatedAt(course)),
        changeFrequency: 'weekly',
        priority: 0.8,
      }
      const lessons = await queryLessonsByCourse({ courseId: course.id })
      const lessonEntries = lessons.flatMap((lesson): MetadataRoute.Sitemap => {
        if (!lesson.slug) return []
        // Paid lessons serve an empty gate shell to anonymous visitors —
        // Google would index that as thin content. Omit from the sitemap
        // until we render a preview for unauthenticated hits.
        if (resolveAccessType(lesson.accessType, course.accessType) === 'paid') return []
        const chapter = typeof lesson.chapter === 'object' ? lesson.chapter : null
        if (!chapter?.slug) return []
        return [
          {
            url: `${host}/courses/${course.slug}/chapters/${chapter.slug}/lessons/${lesson.slug}`,
            lastModified: parseDate(readUpdatedAt(lesson)),
            changeFrequency: 'weekly',
            priority: 0.6,
          },
        ]
      })
      return [courseEntry, ...lessonEntries]
    }),
  )

  return [...entries, ...perCourse.flat()]
}

// Mongo docs carry `updatedAt` but it isn't on the TS types, so read it loosely.
function readUpdatedAt(doc: object): string | null {
  const value = (doc as { updatedAt?: unknown }).updatedAt
  return typeof value === 'string' ? value : null
}

function parseDate(iso: string | null): Date {
  if (!iso) return new Date()
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? new Date() : d
}
