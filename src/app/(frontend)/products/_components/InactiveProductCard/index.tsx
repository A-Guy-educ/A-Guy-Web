'use client'

import type { Product } from '@/infra/types/content'
import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'

interface InactiveProductCardProps {
  product: Product
}

/**
 * Non-clickable product card for the secondary "כל הקורסים" grid.
 *
 * Deliberately renders no `href`, no <a>, no onClick handler. The card is
 * purely informational — the buying path is gated by the active section.
 */
export function InactiveProductCard({ product }: InactiveProductCardProps) {
  const t = useTranslations('products')
  const title = product.name ?? product.title ?? ''
  const billingType = (product.billingType as string) ?? 'one_time'
  const label = billingType === 'subscription' ? t('subscriptionLabel') : t('oneTimeLabel')

  return (
    <article
      className={cn(
        'relative rounded-xl border border-border/60 bg-card shadow-card overflow-hidden',
        'opacity-70',
      )}
    >
      <div className="p-card-padding-sm flex flex-col gap-content-gap-xs">
        {/* Top row: category/grade label + "בקרוב" badge */}
        <div className="flex items-start justify-between gap-content-gap-xs">
          {label && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {label}
            </span>
          )}
          <span className="inline-flex items-center text-[10px] font-black uppercase tracking-wider bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full">
            {t('comingSoon')}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-heading-sm font-bold text-card-foreground leading-snug line-clamp-2">
          {title}
        </h3>
      </div>
    </article>
  )
}
