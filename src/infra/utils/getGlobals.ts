import { unstable_cache } from 'next/cache'

import type { Footer, Header } from '@/infra/types/content'

type Global = 'header' | 'footer'

const globals: Record<Global, Header | Footer> = {
  header: { navItems: [] },
  footer: { navItems: [] },
}

export async function getGlobal(slug: Global, _depth = 0): Promise<Header | Footer> {
  return globals[slug]
}

export const getCachedGlobal = (slug: Global, depth = 0) =>
  unstable_cache(async () => getGlobal(slug, depth), [slug], {
    tags: [`global_${slug}`],
  })
