/**
 * @fileType utility
 * @domain seo
 * @pattern nextjs-metadata-generator
 * @ai-summary Generates Next.js metadata from optional page-like docs.
 */

import type { Metadata } from 'next'

import type { Page } from '@/infra/types/content'

import { mergeOpenGraph } from './mergeOpenGraph'

export const generateMeta = async (args: { doc: Partial<Page> | null }): Promise<Metadata> => {
  const { doc } = args

  const title = doc?.meta?.title ? `${doc.meta.title} | A-Guy` : 'A-Guy'

  return {
    description: doc?.meta?.description,
    openGraph: mergeOpenGraph({
      description: doc?.meta?.description || '',
      title,
      url: Array.isArray(doc?.slug) ? doc?.slug.join('/') : '/',
    }),
    title,
  }
}
