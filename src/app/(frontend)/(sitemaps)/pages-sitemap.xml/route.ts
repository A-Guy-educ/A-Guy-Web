import { getServerSideSitemap } from 'next-sitemap'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'

const getPagesSitemap = unstable_cache(
  async () => {
    const siteUrl =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'https://example.com'

    const lastmod = new Date().toISOString()

    return [
      { loc: `${siteUrl}/search`, lastmod },
      { loc: `${siteUrl}/posts`, lastmod },
    ]
  },
  ['pages-sitemap'],
  { tags: ['pages-sitemap'] },
)

export async function GET() {
  return getServerSideSitemap(await getPagesSitemap())
}
