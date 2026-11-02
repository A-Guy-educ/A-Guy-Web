'use client'

/**
 * Owns the selected tier and the age / Terms / Privacy consent for the whole
 * /subscriptions grid. Each card starts with a "Choose" button; choosing a
 * tier opens the consent checkbox inside that card, and the card's button
 * turns into "Pay", disabled until the box is ticked.
 *
 * The consent used to sit once below the grid. On mobile the cards stack, so
 * it ended up far below the button the student had just tapped. Rendering it
 * inside the chosen card keeps it next to the action it gates. Only one tier
 * is selected at a time, and switching tiers clears the tick so the consent
 * always belongs to the plan being paid for.
 *
 * @fileType component
 * @domain subscriptions
 */

import { useState } from 'react'

import type { TierSlug } from '@/lib/tiers'

import { TierCard } from './TierCard'

interface SubscriptionsCatalogProps {
  tiers: readonly TierSlug[]
}

export function SubscriptionsCatalog({ tiers }: SubscriptionsCatalogProps) {
  const [selectedTier, setSelectedTier] = useState<TierSlug | null>(null)
  const [consented, setConsented] = useState(false)

  const handleSelect = (tier: TierSlug) => {
    if (tier === selectedTier) return
    setSelectedTier(tier)
    setConsented(false)
  }

  return (
    <div className="grid gap-content-gap md:grid-cols-2 xl:grid-cols-4">
      {tiers.map((tier) => (
        <TierCard
          key={tier}
          tier={tier}
          isSelected={selectedTier === tier}
          onSelect={() => handleSelect(tier)}
          isConsented={selectedTier === tier && consented}
          onConsentChange={setConsented}
        />
      ))}
    </div>
  )
}
