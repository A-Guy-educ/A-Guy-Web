'use client'

/**
 * Post-submit confirmation. In the real flow a paid plan would redirect to
 * Tranzilla first and land here on return; a 100%-off code skips payment.
 *
 * @fileType component
 * @domain schools
 */

import { CheckCircle2 } from 'lucide-react'

import { SystemLink } from '@/infra/loading/components/SystemLink'
import { TIER_PRICE_ILS } from '@/lib/tiers'
import { useTranslations } from '@/ui/web/providers/I18n'

import { discountedPrice, type PaidTier } from '../_lib/demo-data'
import { formatIls } from './format'

interface SchoolSignupSuccessProps {
  fullName: string
  email: string
  schoolLabel: string | null
  tier: PaidTier
  percentOff: number
}

export function SchoolSignupSuccess({
  fullName,
  email,
  schoolLabel,
  tier,
  percentOff,
}: SchoolSignupSuccessProps) {
  const t = useTranslations('schoolSignup')
  const tSubs = useTranslations('subscriptions')
  const firstName = fullName.trim().split(/\s+/)[0] ?? ''
  const total = discountedPrice(TIER_PRICE_ILS[tier], percentOff)

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-content-gap rounded-lg border border-border bg-card p-card-padding-lg text-center shadow-elevation-2">
      <CheckCircle2 className="h-14 w-14 text-success" aria-hidden />
      <h2 className="text-heading-lg font-black text-card-foreground">
        {t('success.title').replace('{name}', firstName)}
      </h2>
      <p className="text-body-md text-muted-foreground">
        {t('success.description').replace('{email}', email)}
      </p>

      <dl className="w-full rounded-md bg-muted/40 p-card-padding-sm text-body-sm">
        {schoolLabel ? (
          <div className="flex justify-between gap-content-gap-xs py-1">
            <dt className="text-muted-foreground">{t('fields.school')}</dt>
            <dd className="font-medium text-foreground">{schoolLabel}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-content-gap-xs py-1">
          <dt className="text-muted-foreground">{t('sections.plan')}</dt>
          <dd className="font-medium text-foreground">{tSubs(`tiers.${tier}.name`)}</dd>
        </div>
        <div className="flex justify-between gap-content-gap-xs py-1">
          <dt className="text-muted-foreground">{t('summary.total')}</dt>
          <dd className="font-medium text-foreground">
            {total === 0 ? t('summary.free') : `${formatIls(total)} ${tSubs('perMonth')}`}
          </dd>
        </div>
      </dl>

      <SystemLink
        href="/"
        className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary font-bold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {t('success.cta')}
      </SystemLink>
      <p className="text-body-xs text-muted-foreground">{t('success.demoNote')}</p>
    </div>
  )
}
