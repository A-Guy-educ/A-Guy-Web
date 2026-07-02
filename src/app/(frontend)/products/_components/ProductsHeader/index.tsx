'use client'

import { useTranslations } from '@/ui/web/providers/I18n'

export function ProductsHeader() {
  const t = useTranslations('products')

  return (
    <header className="pt-12 pb-10 bg-gradient-to-b from-card via-card to-background border-b border-border/40 dark:bg-gradient-to-b dark:from-card/80 dark:to-transparent">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <h1 className="text-display-md font-black text-card-foreground section-accent inline-block">
          {t('catalogTitle')}
        </h1>
        <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto mt-6">
          {t('catalogDescription')}
        </p>
        <div className="mt-6 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--badge-orange-bg))] text-[hsl(var(--badge-orange))] border border-[hsl(var(--badge-orange)/0.2)] px-4 py-1.5 text-label font-bold uppercase tracking-wider">
            {t('popularPill')}
          </span>
        </div>
      </div>
    </header>
  )
}
