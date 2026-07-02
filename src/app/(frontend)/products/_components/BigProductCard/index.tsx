'use client'

import { useRouter } from 'next/navigation'

import { getDirection } from '@/i18n/config'
import type { Product } from '@/infra/types/content'
import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'

import { formatProductPrice } from '../../_lib/format'

interface BigProductCardProps {
  product: Product
  locale: string
}

/**
 * Hardcoded "original" (pre-discount) price multiplier. The Products
 * collection doesn't expose an `originalPrice` field per the issue's
 * "no schema changes" constraint, and PM explicitly OK'd hardcoding a fake
 * original for the demo (research notes, option (a)). 2x keeps the visual
 * "strikethrough was/is" relationship clear for the storefront launch.
 */
const ORIGINAL_PRICE_MULTIPLIER = 2

/**
 * Hero purchase card for active paid products — large, orange-accented
 * card with the 🔥 fire badge, "limited offer" label, original (strikethrough)
 * and discounted price, and a prominent "Buy now" CTA that navigates to
 * the existing /products/[slug] purchase page.
 *
 * The CTA uses the router so we get the navigation loading state without a
 * hard reload — matches the rest of the storefront.
 */
export function BigProductCard({ product, locale }: BigProductCardProps) {
  const t = useTranslations('products')
  const router = useRouter()
  const dir = getDirection(locale as 'he' | 'en')

  const currency = (product.currency as string) ?? 'ILS'
  const discountedPrice = typeof product.price === 'number' ? product.price : 0
  const originalPrice = discountedPrice * ORIGINAL_PRICE_MULTIPLIER

  const discountedLabel = formatProductPrice(discountedPrice, currency)
  const originalLabel = formatProductPrice(originalPrice, currency)
  const slug = product.slug ?? ''
  const href = slug ? `/products/${slug}` : null
  const title = product.title || product.name || 'Product'

  const handleBuy = () => {
    if (!href) return
    router.push(href)
  }

  return (
    <article
      dir={dir}
      aria-label={title}
      className={cn(
        'relative overflow-hidden rounded-3xl border border-[hsl(var(--badge-orange)/0.25)]',
        'bg-gradient-to-br from-[hsl(var(--badge-orange-bg))] via-[hsl(var(--warning)/0.18)] to-[hsl(var(--badge-orange)/0.22)]',
        'p-card-padding-lg md:p-12 shadow-card transition-all duration-normal',
        'hover:shadow-card-hover hover:scale-[1.005]',
      )}
    >
      {/* Top row: 🔥 badge + limited offer label */}
      <div className="flex items-center justify-between gap-content-gap flex-wrap">
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[hsl(var(--badge-orange))] text-white text-2xl shadow-elevation-2"
        >
          🔥
        </span>
        <span className="inline-flex items-center rounded-full bg-card/80 text-[hsl(var(--badge-orange))] border border-[hsl(var(--badge-orange)/0.3)] px-3 py-1 text-label font-bold uppercase tracking-wider">
          {t('limitedOffer')}
        </span>
      </div>

      {/* Title + description */}
      <div className="mt-content-gap-lg">
        <h2 className="text-heading-xl md:text-display-sm font-black text-card-foreground leading-tight">
          {title}
        </h2>
        {product.description ? (
          <p className="mt-4 text-body-md text-muted-foreground max-w-prose leading-relaxed">
            {product.description}
          </p>
        ) : null}
      </div>

      {/* Price block */}
      <div className="mt-content-gap-lg flex items-baseline gap-content-gap flex-wrap">
        <span className="text-body-lg md:text-heading-lg text-muted-foreground line-through opacity-70">
          {originalLabel}
        </span>
        <span className="text-display-md md:text-display-lg font-black text-card-foreground leading-none">
          {discountedLabel}
        </span>
        <span className="text-body-md text-muted-foreground font-semibold">{t('onlyLabel')}</span>
      </div>

      {/* CTA */}
      <div className="mt-content-gap-lg">
        <button
          type="button"
          onClick={handleBuy}
          disabled={!href}
          aria-label={`${t('buyNow')} — ${title}`}
          className={cn(
            'w-full md:w-auto md:min-w-[280px] h-14 px-8 rounded-2xl',
            'bg-[hsl(var(--badge-orange))] text-white text-body-md font-bold',
            'shadow-elevation-2 hover:shadow-elevation-3 hover:bg-[hsl(var(--badge-orange)/0.9)]',
            'transition-all duration-normal active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--badge-orange))] focus-visible:ring-offset-2',
            !href && 'opacity-50 cursor-not-allowed',
          )}
        >
          {t('buyNow')}
        </button>
      </div>
    </article>
  )
}
