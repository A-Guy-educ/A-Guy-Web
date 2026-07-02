'use client'

import type { Product } from '@/infra/types/content'
import { StaggerGrid, StaggerItem } from '@/ui/web/components/motion'
import { InactiveProductCard } from '../InactiveProductCard'

interface InactiveProductsGridProps {
  products: Product[]
  heading: string
}

export function InactiveProductsGrid({ products, heading }: InactiveProductsGridProps) {
  if (products.length === 0) return null

  return (
    <section className="mt-section-md">
      <h2 className="text-heading-xl font-black text-card-foreground mb-content-gap">{heading}</h2>
      <StaggerGrid className="grid gap-content-gap md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <StaggerItem key={product.id}>
            <InactiveProductCard product={product} />
          </StaggerItem>
        ))}
      </StaggerGrid>
    </section>
  )
}
