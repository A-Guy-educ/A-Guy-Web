import { getServerSideSitemap } from 'next-sitemap'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'

const getPostsSitemap = unstable_cache(async () => [], ['posts-sitemap'], {
  tags: ['posts-sitemap'],
})

export async function GET() {
  return getServerSideSitemap(await getPostsSitemap())
}
