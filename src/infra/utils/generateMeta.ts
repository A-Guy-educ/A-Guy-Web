/**
 * @fileType utility
 * @domain seo
 * @pattern nextjs-metadata-generator
 * @ai-summary Generates Next.js metadata from optional page-like docs.
 */

import type { Metadata } from 'next'

import type { Page } from '@/infra/types/content'

import { mergeOpenGraph } from './mergeOpenGraph'
import { getServerSideURL } from './getURL'

const getImageURL = () => {
  const serverUrl = getServerSideURL()
  return serverUrl + '/website-template-OG.webp'
}

export const generateMeta = async (args: { doc: Partial<Page> | null }): Promise<Metadata> => {
  const { doc } = args

  const ogImage = getImageURL()

  const title = doc?.meta?.title ? `${doc.meta.title} | A-Guy` : 'A-Guy'

  return {
    description: doc?.meta?.description,
    openGraph: mergeOpenGraph({
      description: doc?.meta?.description || '',
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
      title,
      url: Array.isArray(doc?.slug) ? doc?.slug.join('/') : '/',
    }),
    title,
  }
}
