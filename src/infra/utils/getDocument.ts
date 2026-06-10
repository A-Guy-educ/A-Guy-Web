import { unstable_cache } from 'next/cache'

export async function getDocument(_collection: string, _slug: string, _depth = 0) {
  return null
}

export const getCachedDocument = (collection: string, slug: string) =>
  unstable_cache(async () => getDocument(collection, slug), [collection, slug], {
    tags: [`${collection}_${slug}`],
  })
