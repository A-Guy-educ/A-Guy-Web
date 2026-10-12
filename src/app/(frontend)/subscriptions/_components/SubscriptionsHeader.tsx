'use client'

import { useTranslations } from '@/ui/web/providers/I18n'

export function SubscriptionsHeader() {
  const t = useTranslations('subscriptions')

  return (
    <header className="border-b border-border bg-background pb-section-md pt-section-md">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h1 className="mx-auto max-w-3xl text-display-sm font-black text-card-foreground md:text-display-md">
          {t('title')}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-body-lg leading-relaxed text-muted-foreground">
          {t('description')}
        </p>
      </div>
    </header>
  )
}
