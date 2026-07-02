'use client'

import type { Product } from '@/infra/types/content'
import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'

import { deriveProductGradeLabel, formatProductPrice } from '../../_lib/format'

interface InactiveProductCardProps {
  product: Product
  locale: string
}

/**
 * "Coming soon" card for inactive / free products. Intentionally NOT wrapped
 * in an `<a>` and has no `href` — per PM direction, users cannot navigate
 * to these products (they are either free or inactive). The card is
 * visually marked as non-interactive via reduced opacity and the absence
 * of any hover-state lift.
 */
export function InactiveProductCard({ product, locale }: InactiveProductCardProps) {
  const t = useTranslations('products')
  const title = product.title || product.name || 'Product'
  const gradeLabel = deriveProductGradeLabel(title, locale)

  const currency = (product.currency as string) ?? 'ILS'
  const price = typeof product.price === 'number' ? product.price : null
  const priceLabel = price !== null && price > 0 ? formatProductPrice(price, currency) : null

  return (
    <article
      className={cn(
        'group relative rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden',
        'p-card-padding flex flex-col gap-content-gap-sm',
        'opacity-70 cursor-default select-none',
      )}
    >
      {/* Top row: grade badge + coming-soon pill */}
      <div className="flex items-start justify-between gap-content-gap-xs">
        {gradeLabel ? (
          <span
            className={cn(
              'inline-flex items-center justify-center min-w-[2.25rem] h-9 rounded-lg',
              'bg-[hsl(var(--badge-orange)/0.12)] text-[hsl(var(--badge-orange))]',
              'text-body-md font-black border border-[hsl(var(--badge-orange)/0.25)]',
            )}
          >
            {gradeLabel}
          </span>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-3 py-1 text-label font-bold uppercase tracking-wider">
          {t('comingSoon')}
        </span>
      </div>

      {/* Title + price */}
      <div className="flex-1">
        <h3 className="text-heading-md font-bold text-card-foreground leading-snug">{title}</h3>
        {priceLabel ? (
          <p className="mt-2 text-body-sm text-muted-foreground font-semibold">{priceLabel}</p>
        ) : null}
      </div>
    </article>
  )
}
