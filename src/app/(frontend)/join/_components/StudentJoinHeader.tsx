'use client'

import { Bot } from 'lucide-react'

import { useTranslations } from '@/ui/web/providers/I18n'

export function StudentJoinHeader() {
  const t = useTranslations('studentJoin')

  return (
    <header className="flex flex-col items-center gap-3 pt-3 text-center">
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-card shadow-elevation-2">
        <Bot className="h-9 w-9 text-primary" aria-hidden />
      </div>
      <div dir="ltr" className="text-body-sm font-black tracking-wide text-primary">
        A-Guy
      </div>
      <h1 className="text-display-sm font-black text-foreground">{t('title')}</h1>
      <p className="text-body-md text-muted-foreground">{t('subtitle')}</p>
    </header>
  )
}

export function StudentJoinFootnote() {
  const t = useTranslations('studentJoin')
  return <p className="text-center text-body-xs text-muted-foreground">{t('footnote')}</p>
}
