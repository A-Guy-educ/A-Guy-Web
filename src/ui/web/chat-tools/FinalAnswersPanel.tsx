'use client'

import { ListChecks } from 'lucide-react'

import { useTranslations } from '@/ui/web/providers/I18n'

/** Placeholder until final answers per section exist in the content model. */
export function FinalAnswersPanel({ onBackToChat }: { onBackToChat: () => void }) {
  const t = useTranslations('courses.chatTools')
  return (
    <div className="flex h-full flex-col items-center justify-center gap-content-gap p-card-padding text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ListChecks className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-body-xs font-semibold text-primary">
        {t('comingSoonTitle')}
      </span>
      <p className="max-w-xs text-body-sm leading-relaxed text-muted-foreground">
        {t('answersComingSoon')}
      </p>
      <button
        type="button"
        onClick={onBackToChat}
        className="rounded-lg border border-border px-3 py-1.5 text-body-xs font-medium text-foreground transition-colors duration-normal hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
      >
        {t('backToChat')}
      </button>
    </div>
  )
}
