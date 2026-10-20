'use client'

/**
 * Owns the shared age / Terms / Privacy consent for the whole /subscriptions
 * grid. One checkbox below the cards gates every "Continue" button — picking
 * a tier before consenting shows a toast and does not advance to Tranzilla.
 *
 * The server page used to map `TIER_SLUGS → <TierCard />` directly; now it
 * hands that same list to this client wrapper so we can hoist consent state
 * out of the individual card. Avoids three stacked identical checkboxes
 * (one per non-current tier card) and keeps the attestation legally
 * meaningful — the student actively ticks the box once per visit.
 *
 * @fileType component
 * @domain subscriptions
 */

import { useState } from 'react'

import type { TierSlug } from '@/lib/tiers'
import { PurchaseConsentCheckbox } from '@/ui/web/upsell/PurchaseConsentCheckbox'

import { TierCard } from './TierCard'

interface SubscriptionsCatalogProps {
  tiers: readonly TierSlug[]
}

export function SubscriptionsCatalog({ tiers }: SubscriptionsCatalogProps) {
  const [consented, setConsented] = useState(false)

  return (
    <>
      <div className="grid gap-content-gap md:grid-cols-2 xl:grid-cols-4">
        {tiers.map((tier) => (
          <TierCard key={tier} tier={tier} isConsented={consented} />
        ))}
      </div>
      <div className="mt-section-sm flex justify-center">
        <PurchaseConsentCheckbox
          id="subscriptions-consent"
          checked={consented}
          onCheckedChange={setConsented}
          className="max-w-2xl"
        />
      </div>
    </>
  )
}
