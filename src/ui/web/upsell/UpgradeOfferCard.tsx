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
  /** Student's current tier. Offers only strictly-higher tiers:
   *   - `free`   → basic + advanced
   *   - `basic`  → advanced + premium
   *   - `advanced` → premium
   *   - `premium`  → no tier buttons (restricted copy only)
   */
  currentTier?: TierSlug
}

/**
 * Default upsell when `currentTier` isn't supplied — matches the pre-tier-aware
 * behavior so unrelated call sites don't regress.
 */
const DEFAULT_OFFER_TIERS: TierSlug[] = ['basic', 'advanced']
const DEFAULT_RECOMMENDED_TIER: TierSlug = 'advanced'

/**
 * Only tiers strictly above the student's current one — no "upgrade" to the
 * plan they already pay for, no sideways free→free promo, no premium→nothing
 * loop. Recommended tier prefers `advanced` when it's one of the eligible
 * options; otherwise falls back to the first option (e.g., `premium` when the
 * student is already on advanced).
 */
const TIER_ORDER: readonly TierSlug[] = ['free', 'basic', 'advanced', 'premium']

function resolveOfferTiers(currentTier: TierSlug | undefined): {
  offerTiers: TierSlug[]
  recommended: TierSlug | null
} {
  if (!currentTier) {
    return { offerTiers: DEFAULT_OFFER_TIERS, recommended: DEFAULT_RECOMMENDED_TIER }
  }
  const currentIdx = TIER_ORDER.indexOf(currentTier)
  const higher = currentIdx >= 0 ? TIER_ORDER.slice(currentIdx + 1) : DEFAULT_OFFER_TIERS
  const recommended = higher.includes('advanced') ? 'advanced' : (higher[0] ?? null)
  return { offerTiers: higher, recommended }
}

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
  currentTier,
}: UpgradeOfferCardProps) {
  const tSubs = useTranslations('subscriptions')
  const tOffer = useTranslations('upgradeOffer')
  const [selectedTier, setSelectedTier] = useState<TierSlug | null>(null)
  const [skipped, setSkipped] = useState(false)

  const { offerTiers, recommended } = resolveOfferTiers(currentTier)

  if (skipped) {
    return (
      <div className="self-start max-w-[90%] rounded-2xl border border-border bg-muted/40 p-card-padding-sm text-body-sm text-muted-foreground">
        {restrictedLabel}
      </div>
    )
  }

  // Premium (or any future top-tier) users have nothing to upgrade to — show
  // only the headline + intro + skip link, no tier buttons.
  const hasTierButtons = offerTiers.length > 0

  return (
    <>
      <article className="self-start w-full max-w-[90%] rounded-2xl border-2 border-primary/30 bg-primary/[0.03] p-card-padding shadow-elevation-1">
        <h3 className="text-heading-sm font-black text-foreground">{title}</h3>
        <p className="mt-2 text-body-sm text-muted-foreground leading-relaxed">{intro}</p>

        {hasTierButtons ? (
          <div className="mt-4 grid gap-content-gap-xs sm:grid-cols-2">
            {offerTiers.map((tier) => {
              const isRecommended = tier === recommended
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
        ) : null}

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
