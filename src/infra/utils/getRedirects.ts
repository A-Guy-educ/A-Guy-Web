import { unstable_cache } from 'next/cache'

export interface RedirectRule {
  from?: string | null
  to?: {
    url?: string | null
    reference?: {
      relationTo: string
      value: string | { slug?: string | null }
    } | null
  } | null
}

export async function getRedirects(_depth = 1): Promise<RedirectRule[]> {
  return []
}

export const getCachedRedirects = () =>
  unstable_cache(async () => getRedirects(), ['redirects'], {
    tags: ['redirects'],
  })
