'use client'

import { useTranslations } from '@/ui/web/providers/I18n'

export function ComingSoonHeading() {
  const t = useTranslations('products')

  return (
    <div className="mb-content-gap">
      <h3 className="text-heading-xl font-bold text-card-foreground section-accent inline-block">
        {t('comingSoonHeading')}
      </h3>
    </div>
  )
}
