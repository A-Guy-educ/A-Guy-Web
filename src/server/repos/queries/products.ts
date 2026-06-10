import { cache } from 'react'

import type { Product } from '@/infra/types/content'
import { findManySerialized, findOneSerialized } from '../mongo'

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    title: product.title || product.name || '',
  }
}

export const queryActiveProducts = cache(async (): Promise<Product[]> => {
  const products = await findManySerialized<Product>(
    'products',
    { isActive: true },
    { sort: { createdAt: 1 }, limit: 100 },
  )
  return products.map(normalizeProduct)
})

export const queryProductBySlug = cache(
  async ({ slug }: { slug: string }): Promise<Product | null> => {
    const product = await findOneSerialized<Product>('products', { slug, isActive: true })
    return product ? normalizeProduct(product) : null
  },
)

export const queryAllProductSlugs = cache(async (): Promise<{ slug: string }[]> => {
  const products = await findManySerialized<Product>(
    'products',
    { isActive: true },
    { projection: { slug: 1 }, limit: 1000 },
  )
  return products
    .filter((product) => product.slug)
    .map((product) => ({ slug: product.slug as string }))
})
