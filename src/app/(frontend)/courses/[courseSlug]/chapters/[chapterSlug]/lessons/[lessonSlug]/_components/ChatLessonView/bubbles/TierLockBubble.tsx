'use client'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { getUserTierSlug } from '@/lib/tiers'
import { useTranslations } from '@/ui/web/providers/I18n'
import { UpgradeOfferCard } from '@/ui/web/upsell/UpgradeOfferCard'

/**
 * Terminal card shown where a lesson was clamped by the free-tier exercise
 * gate — at the end of the chat stream and after the 3rd exercise in the
 * scroll view. Reuses the quota-exhausted `UpgradeOfferCard` layout (headline
 * + intro + tier buttons opening the checkout dialog) so both upgrade walls
 * look the same, minus the "continue" link: past the gate there is nothing
 * left to continue to.
 */
export function TierLockBubble() {
  const t = useTranslations('courses')
  const { user } = useCurrentUser()
  const currentTier = getUserTierSlug(user as { currentTier?: string | null } | null)
  return (
    <UpgradeOfferCard
      title={t('chatViewTierLockTitle')}
      intro={t('chatViewTierLockBody')}
      currentTier={currentTier}
    />
  )
}
