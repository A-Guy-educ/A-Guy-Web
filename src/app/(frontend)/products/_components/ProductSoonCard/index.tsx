'use client'

import type { Product } from '@/infra/types/content'
import { UnifiedCard } from '@/ui/web/components/UnifiedCard'
import { useTranslations } from '@/ui/web/providers/I18n'

interface ProductSoonCardProps {
  product: Product
}

export function ProductSoonCard({ product }: ProductSoonCardProps) {
  const t = useTranslations('products')

  return (
    <UnifiedCard
      title={product.name ?? 'Product'}
      description={t('comingSoonButton')}
      label={product.name ?? t('comingSoonButton')}
      contentStatus="soon"
      contentStatusLabel={t('comingSoonButton')}
      buttonLabel={t('comingSoonButton')}
      buttonDisabled
      // No cardHref — the card is intentionally non-clickable in the
      // "soon" state. The disabled button below communicates that.
    />
  )
}
