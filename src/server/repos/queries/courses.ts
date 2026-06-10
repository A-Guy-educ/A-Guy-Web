import { cache } from 'react'

import type { ContentLocale, Course } from '@/infra/types/content'
import {
  andFilter,
  defaultTenantFilter,
  findManySerialized,
  findOneSerialized,
  localeFilter,
  visibleContentFilter,
} from '../mongo'

export const queryCourseBySlug = cache(
  async ({ slug, locale }: { slug: string; locale?: ContentLocale }): Promise<Course | null> => {
    return findOneSerialized<Course>(
      'courses',
      andFilter(
        { slug },
        visibleContentFilter(),
        localeFilter(locale),
        await defaultTenantFilter(),
      ),
    )
  },
)

export const queryPublishedCourses = cache(async (locale?: ContentLocale): Promise<Course[]> => {
  return findManySerialized<Course>(
    'courses',
    andFilter(visibleContentFilter(), localeFilter(locale), await defaultTenantFilter()),
    { sort: { order: 1 } },
  )
})
