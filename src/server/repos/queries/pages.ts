import { cache } from 'react'

import type { Page } from '@/infra/types/content'
import { findManySerialized, findOneSerialized } from '../mongo'

export const queryPageBySlug = cache(async ({ slug }: { slug: string }): Promise<Page | null> => {
  return findOneSerialized<Page>('pages', { slug })
})

export const queryPublishedPages = cache(async (): Promise<Page[]> => {
  return findManySerialized<Page>('pages', { _status: 'published' }, { sort: { publishedAt: 1 } })
})

export const queryAllPageSlugs = cache(async (): Promise<{ slug: string }[]> => {
  const pages = await findManySerialized<Page>(
    'pages',
    { slug: { $exists: true, $ne: 'home' } },
    { limit: 25, projection: { slug: 1 } },
  )
  return pages.filter((page) => page.slug).map((page) => ({ slug: page.slug as string }))
})

export const queryAllPagesForSitemap = cache(async (): Promise<Page[]> => {
  return findManySerialized<Page>(
    'pages',
    { _status: 'published' },
    { projection: { slug: 1, updatedAt: 1 }, limit: 1000 },
  )
})
