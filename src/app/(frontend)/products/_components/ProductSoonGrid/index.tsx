'use client'

import type { Product } from '@/infra/types/content'
import { StaggerGrid, StaggerItem } from '@/ui/web/components/motion'
import { ProductSoonCard } from '../ProductSoonCard'

interface ProductSoonGridProps {
  products: Product[]
}

export function ProductSoonGrid({ products }: ProductSoonGridProps) {
  return (
    <StaggerGrid className="grid gap-content-gap-xl md:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <StaggerItem key={product.id}>
          <ProductSoonCard product={product} />
        </StaggerItem>
      ))}
    </StaggerGrid>
  )
}
