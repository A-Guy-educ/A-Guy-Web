import type { MetadataRoute } from 'next'

import { getBrand } from '@/brands'

export default function robots(): MetadataRoute.Robots {
  const host = getBrand().config.host.replace(/\/$/, '')
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Admin UI and server endpoints have no public value; `_next` is Next.js
        // internals that crawlers would waste budget on. Everything else is open.
        disallow: ['/admin', '/api/', '/_next/'],
      },
    ],
    sitemap: `${host}/sitemap.xml`,
    host,
  }
}
