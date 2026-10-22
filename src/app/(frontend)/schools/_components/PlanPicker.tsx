'use client'

/**
 * Three paid tiers as a radio group. Prices show the school discount inline
 * (struck-through list price) so the student sees what the code is worth
 * before they reach the summary.
 *
 * @fileType component
 * @domain schools
 */

import { cn } from '@/infra/utils/ui'
import { TIER_PRICE_ILS } from '@/lib/tiers'
import { useTranslations } from '@/ui/web/providers/I18n'

import { PAID_TIERS, discountedPrice, type PaidTier } from '../_lib/demo-data'
import { formatIls } from './format'

interface PlanPickerProps {
  value: PaidTier
  onChange: (tier: PaidTier) => void
  percentOff: number
}

export function PlanPicker({ value, onChange, percentOff }: PlanPickerProps) {
  const t = useTranslations('subscriptions')
  const tSchool = useTranslations('schoolSignup')

  return (
    <div role="radiogroup" className="grid gap-content-gap-xs sm:grid-cols-3">
      {PAID_TIERS.map((tier) => {
        const isSelected = tier === value
        const listPrice = TIER_PRICE_ILS[tier]
        const finalPrice = discountedPrice(listPrice, percentOff)
        return (
          <button
            key={tier}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(tier)}
            className={cn(
              'relative flex flex-col gap-1 rounded-lg border-2 p-card-padding-sm text-start transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/40',
            )}
          >
            {tier === 'advanced' ? (
              <span className="absolute end-2 top-2 rounded-full bg-primary px-2 py-0.5 text-label font-bold text-primary-foreground">
                {t('mostPopular')}
              </span>
            ) : null}
            <span className="text-body-md font-black text-card-foreground">
              {t(`tiers.${tier}.name`)}
            </span>
            <span className="text-body-xs text-muted-foreground">{t(`tiers.${tier}.tagline`)}</span>
            <span className="mt-2 flex items-baseline gap-content-gap-xs">
              <span className="text-heading-sm font-black text-foreground">
                {finalPrice === 0 ? tSchool('summary.free') : formatIls(finalPrice)}
              </span>
              {percentOff > 0 ? (
                <span className="text-body-xs text-muted-foreground line-through">
                  {formatIls(listPrice)}
                </span>
              ) : null}
            </span>
            <span className="text-body-xs text-muted-foreground">{t('perMonth')}</span>
          </button>
        )
      })}
    </div>
  )
}
