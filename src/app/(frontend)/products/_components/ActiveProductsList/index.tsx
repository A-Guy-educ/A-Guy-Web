'use client'

import type { Product } from '@/infra/types/content'
import { FadeIn } from '@/ui/web/components/motion'
import { ActiveProductCard } from '../ActiveProductCard'

interface ActiveProductsListProps {
  products: Product[]
}

export function ActiveProductsList({ products }: ActiveProductsListProps) {
  return (
    <div className="flex flex-col gap-content-gap-xl">
      {products.map((product, index) => (
        <FadeIn key={product.id} delay={index * 0.05}>
          <ActiveProductCard product={product} />
        </FadeIn>
      ))}
    </div>
  )
}
