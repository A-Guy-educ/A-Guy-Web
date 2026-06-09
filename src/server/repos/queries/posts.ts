import { cache } from 'react'

import type { Post } from '@/infra/types/content'
import { countDocs, findManySerialized, findOneSerialized } from '../mongo'
import type { PaginatedResult } from './empty'

function paginated<T>(
  docs: T[],
  totalDocs: number,
  limit: number,
  page: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(totalDocs / limit)
  return {
    docs,
    totalDocs,
    limit,
    totalPages,
    page,
    pagingCounter: totalDocs === 0 ? 0 : (page - 1) * limit + 1,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
    prevPage: page > 1 ? page - 1 : null,
    nextPage: page < totalPages ? page + 1 : null,
  }
}

export const queryPostBySlug = cache(async ({ slug }: { slug: string }): Promise<Post | null> => {
  return findOneSerialized<Post>('posts', { slug })
})

export const queryPublishedPosts = cache(
  async ({ limit = 12, page = 1 }: { limit?: number; page?: number } = {}) => {
    const filter = { _status: 'published' }
    const [docs, totalDocs] = await Promise.all([
      findManySerialized<Post>('posts', filter, {
        sort: { createdAt: -1 },
        limit,
        skip: (page - 1) * limit,
      }),
      countDocs('posts', filter),
    ])

    return paginated(docs, totalDocs, limit, page)
  },
)

export const searchPosts = cache(
  async ({ query, limit = 12 }: { query: string; limit?: number }) => {
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const filter = {
      $or: [
        { title: regex },
        { 'meta.description': regex },
        { 'meta.title': regex },
        { slug: regex },
      ],
    }
    const docs = await findManySerialized<Post>('posts', filter, { limit })
    return paginated(docs, docs.length, limit, 1)
  },
)

export const queryAllPostsForSitemap = cache(async (): Promise<Post[]> => {
  return findManySerialized<Post>(
    'posts',
    { _status: 'published' },
    { projection: { slug: 1, updatedAt: 1 }, limit: 1000 },
  )
})

export const queryAllPostSlugs = cache(async (): Promise<{ slug: string }[]> => {
  const posts = await findManySerialized<Post>('posts', {}, { projection: { slug: 1 }, limit: 25 })
  return posts.filter((post) => post.slug).map((post) => ({ slug: post.slug as string }))
})
