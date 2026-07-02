'use client'

import type { Product } from '@/infra/types/content'
import { FadeIn } from '@/ui/web/components/motion'
import { useTranslations } from '@/ui/web/providers/I18n'

import { BigProductCard } from '../BigProductCard'
import { InactiveProductCard } from '../InactiveProductCard'

interface ProductCardGridProps {
  activeProducts: Product[]
  inactiveProducts: Product[]
  locale: string
}

/**
 * Storefront grid — splits products into two visually distinct sections:
 *
 * 1. Active paid products → one full-width "big" hero card each, stacked
 *    vertically. There's NO fallback to a small card for active products,
 *    per the spec — when 2+ are active they ALL render as big cards.
 *
 * 2. Inactive / free products → small "coming soon" cards in a responsive
 *    grid (md:grid-cols-2 lg:grid-cols-3, matching the design reference).
 *
 * When the inactive list is empty, the "all courses" heading + grid are
 * NOT rendered at all. When the active list is empty, the parent shows a
 * fallback empty-state message instead of calling this component.
 */
export function ProductCardGrid({
  activeProducts,
  inactiveProducts,
  locale,
}: ProductCardGridProps) {
  const t = useTranslations('products')

  return (
    <div className="flex flex-col gap-content-gap-xl">
      {activeProducts.length > 0 ? (
        <div className="flex flex-col gap-content-gap-xl">
          {activeProducts.map((product) => (
            <FadeIn key={product.id}>
              <BigProductCard product={product} locale={locale} />
            </FadeIn>
          ))}
        </div>
      ) : null}

      {inactiveProducts.length > 0 ? (
        <section className="flex flex-col gap-content-gap-lg">
          <h3 className="text-heading-lg md:text-heading-xl font-black text-card-foreground">
            {t('allCourses')}
          </h3>
          <div className="grid gap-content-gap md:grid-cols-2 lg:grid-cols-3">
            {inactiveProducts.map((product) => (
              <InactiveProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
