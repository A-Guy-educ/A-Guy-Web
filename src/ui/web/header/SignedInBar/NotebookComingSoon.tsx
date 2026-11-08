'use client'

import { BookOpen } from 'lucide-react'

import { useTranslations } from '@/ui/web/providers/I18n'

export function NotebookComingSoon() {
  const t = useTranslations('common.header')

  return (
    <button
      type="button"
      disabled
      className="relative flex min-h-[44px] cursor-not-allowed items-center gap-content-gap-xs rounded-xl px-2 text-body-sm font-semibold text-muted-foreground/60"
    >
      <BookOpen className="h-5 w-5" aria-hidden />
      <span className="sr-only md:not-sr-only">{t('notebook')}</span>
      <span className="absolute -end-1 top-0 whitespace-nowrap rounded-md bg-muted px-1.5 text-body-xs font-bold text-muted-foreground md:static">
        {t('comingSoon')}
      </span>
    </button>
  )
}
