'use client'

/**
 * Sticky price breakdown beside the form: plan, school discount, monthly
 * total. Also names the school once one is picked, so the student can see
 * the code is tied to the right place.
 *
 * @fileType component
 * @domain schools
 */

import { School } from 'lucide-react'

import { TIER_PRICE_ILS } from '@/lib/tiers'
import { useTranslations } from '@/ui/web/providers/I18n'

import { discountedPrice, type PaidTier } from '../_lib/demo-data'
import { formatIls } from './format'

interface OrderSummaryProps {
  tier: PaidTier
  percentOff: number
  couponCode: string | null
  schoolLabel: string | null
}

export function OrderSummary({ tier, percentOff, couponCode, schoolLabel }: OrderSummaryProps) {
  const t = useTranslations('schoolSignup')
  const tSubs = useTranslations('subscriptions')

  const listPrice = TIER_PRICE_ILS[tier]
  const total = discountedPrice(listPrice, percentOff)
  const discount = listPrice - total

  return (
    <aside className="rounded-lg border border-border bg-card p-card-padding shadow-elevation-1">
      <h2 className="text-heading-sm font-black text-card-foreground">{t('summary.title')}</h2>

      {schoolLabel ? (
        <p className="mt-3 flex items-center gap-content-gap-xs text-body-sm text-muted-foreground">
          <School className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{schoolLabel}</span>
        </p>
      ) : null}

      <dl className="mt-4 flex flex-col gap-content-gap-xs text-body-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">
            {t('summary.plan').replace('{tier}', tSubs(`tiers.${tier}.name`))}
          </dt>
          <dd className="font-medium text-foreground">{formatIls(listPrice)}</dd>
        </div>
        {discount > 0 && couponCode ? (
          <div className="flex justify-between text-success">
            <dt>{t('summary.discount').replace('{code}', couponCode)}</dt>
            <dd className="font-medium">−{formatIls(discount)}</dd>
          </div>
        ) : null}
        <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
          <dt className="font-bold text-foreground">{t('summary.total')}</dt>
          <dd className="text-heading-md font-black text-primary">
            {total === 0 ? t('summary.free') : formatIls(total)}
            {total > 0 ? (
              <span className="ms-1 text-body-xs font-normal text-muted-foreground">
                {tSubs('perMonth')}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-body-xs text-muted-foreground">
        {total === 0 ? t('summary.noPayment') : t('summary.billedMonthly')}
      </p>
    </aside>
  )
}
