'use client'

import { useState } from 'react'

import { useTranslations } from '@/ui/web/providers/I18n'
import { TIER_PRICE_ILS, type TierSlug } from '@/lib/tiers'
import { UpgradeCheckoutDialog } from './UpgradeCheckoutDialog'

export interface UpgradeOfferCardProps {
  /** Headline text ("ממשיכים עם העזרה?"). */
  title: string
  /** Short explanation under the headline. */
  intro: string
  /** Label for the "continue without AI" skip link. */
  continueLabel: string
  /** Called when the student skips the offer. */
  onContinue: () => void
  /** Label describing restricted mode after the student skipped. */
  restrictedLabel: string
}

/** Tiers surfaced in the upsell. Keeps the UI focused on the two
 *  practical choices without re-pricing the full `/subscriptions` grid. */
const OFFER_TIERS: TierSlug[] = ['basic', 'advanced']
const RECOMMENDED_TIER: TierSlug = 'advanced'

const CURRENCY_FORMAT = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function UpgradeOfferCard({
  title,
  intro,
  continueLabel,
  onContinue,
  restrictedLabel,
}: UpgradeOfferCardProps) {
  const tSubs = useTranslations('subscriptions')
  const tOffer = useTranslations('upgradeOffer')
  const [selectedTier, setSelectedTier] = useState<TierSlug | null>(null)
  const [skipped, setSkipped] = useState(false)

  if (skipped) {
    return (
      <div className="self-start max-w-[90%] rounded-2xl border border-border bg-muted/40 p-card-padding-sm text-body-sm text-muted-foreground">
        {restrictedLabel}
      </div>
    )
  }

  return (
    <>
      <article className="self-start w-full max-w-[90%] rounded-2xl border-2 border-primary/30 bg-primary/[0.03] p-card-padding shadow-elevation-1">
        <h3 className="text-heading-sm font-black text-foreground">{title}</h3>
        <p className="mt-2 text-body-sm text-muted-foreground leading-relaxed">{intro}</p>

        <div className="mt-4 grid gap-content-gap-xs sm:grid-cols-2">
          {OFFER_TIERS.map((tier) => {
            const isRecommended = tier === RECOMMENDED_TIER
            const tierName = tSubs(`tiers.${tier}.name`)
            const tagline = tSubs(`tiers.${tier}.tagline`)
            const price = TIER_PRICE_ILS[tier]
            return (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={[
                  'relative flex flex-col items-start gap-1 rounded-xl border p-3 text-start transition-all',
                  'hover:-translate-y-0.5 hover:shadow-elevation-2',
                  isRecommended
                    ? 'border-primary bg-card ring-1 ring-primary/30'
                    : 'border-border bg-card',
                ].join(' ')}
              >
                {isRecommended ? (
                  <span className="absolute end-2 top-2 rounded-full bg-primary px-2 py-0.5 text-body-2xs font-bold text-primary-foreground">
                    {tOffer('recommended')}
                  </span>
                ) : null}
                <span className="text-body-sm font-bold text-foreground">{tierName}</span>
                <span className="text-heading-md font-black text-primary tabular-nums">
                  {CURRENCY_FORMAT.format(price)}
                  <span className="ms-1 text-body-xs font-normal text-muted-foreground">
                    {tSubs('perMonth')}
                  </span>
                </span>
                <span className="text-body-xs text-muted-foreground">{tagline}</span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setSkipped(true)
            onContinue()
          }}
          className="mt-3 text-body-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          {continueLabel}
        </button>
      </article>

      {selectedTier ? (
        <UpgradeCheckoutDialog tier={selectedTier} onClose={() => setSelectedTier(null)} />
      ) : null}
    </>
  )
}
