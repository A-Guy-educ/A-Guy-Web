'use client'

import { FlaskConical, GraduationCap } from 'lucide-react'

import { useTranslations } from '@/ui/web/providers/I18n'

import { DEMO_COUPON_CODES } from '../_lib/demo-data'

export function SchoolsHeader() {
  const t = useTranslations('schoolSignup')

  return (
    <header className="border-b border-border bg-background pb-section-sm pt-section-md">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <span className="inline-flex items-center gap-content-gap-xs rounded-full bg-primary/10 px-3 py-1 text-label font-bold text-primary">
          <GraduationCap className="h-4 w-4" aria-hidden />
          {t('badge')}
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl text-display-sm font-black text-card-foreground md:text-display-md">
          {t('title')}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-body-lg leading-relaxed text-muted-foreground">
          {t('description')}
        </p>
        <p className="mx-auto mt-6 inline-flex max-w-2xl items-center gap-content-gap-xs rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-body-xs text-foreground">
          <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            {t('demoBanner')}{' '}
            <span dir="ltr" className="font-mono font-bold">
              {DEMO_COUPON_CODES.join(' · ')}
            </span>
          </span>
        </p>
      </div>
    </header>
  )
}
