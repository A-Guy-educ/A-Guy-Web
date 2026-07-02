'use client'

import Link from 'next/link'
import { Flame } from 'lucide-react'

import type { Product } from '@/infra/types/content'
import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'

interface ActiveProductCardProps {
  product: Product
}

function formatPrice(price: number, currency: string): string {
  const formatter = new Intl.NumberFormat(currency === 'ILS' ? 'he-IL' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return formatter.format(price)
}

export function ActiveProductCard({ product }: ActiveProductCardProps) {
  const t = useTranslations('products')
  const currency = (product.currency as string) ?? 'ILS'
  const price = typeof product.price === 'number' ? product.price : 0
  const originalPrice =
    typeof product.originalPrice === 'number' && product.originalPrice > price
      ? product.originalPrice
      : null

  const priceLabel = formatPrice(price, currency)
  const originalLabel = originalPrice !== null ? formatPrice(originalPrice, currency) : null
  const title = product.name ?? product.title ?? ''

  return (
    <article
      className={cn(
        'group relative rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden',
        'transition-all duration-normal hover:shadow-card-hover',
      )}
    >
      {/* Top-left badge: fire + "limited offer" (Hebrew, per PM scope) */}
      <div className="absolute top-4 start-4 z-10 inline-flex items-center gap-1.5 bg-destructive text-destructive-foreground text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-elevation-1">
        <Flame className="w-3.5 h-3.5" aria-hidden="true" />
        <span>מבצע לזמן מוגבל</span>
      </div>

      <div className="p-card-padding-lg flex flex-col gap-content-gap pt-16">
        {/* Title (H2 per SHOP1.html preview) */}
        <h2 className="text-heading-xl font-black text-card-foreground leading-tight">{title}</h2>

        {/* Description */}
        {product.description && (
          <p className="text-body-md text-muted-foreground line-clamp-3 [&_p]:m-0">
            {product.description}
          </p>
        )}

        {/* Price row: strikethrough original → discounted */}
        <div className="flex items-baseline gap-3 mt-2">
          {originalLabel && (
            <span className="text-body-lg text-muted-foreground line-through">{originalLabel}</span>
          )}
          <span className="text-display-sm font-black text-primary">{priceLabel}</span>
        </div>

        {/* CTA → product detail page */}
        {product.slug && (
          <Link
            href={`/products/${product.slug}`}
            className={cn(
              'mt-2 inline-flex items-center justify-center min-h-[44px] rounded-xl',
              'bg-primary text-primary-foreground text-body-md font-bold px-6 py-3',
              'transition-all duration-normal hover:bg-primary/90 hover:shadow-elevation-1',
            )}
          >
            {t('buyNow')}
          </Link>
        )}
      </div>
    </article>
  )
}
