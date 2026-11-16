'use client'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { getUserTierSlug } from '@/lib/tiers'
import { useTranslations } from '@/ui/web/providers/I18n'
import { UpgradeOfferCard } from '@/ui/web/upsell/UpgradeOfferCard'
import type { QuotaOfferReason, QuotaOfferSource } from '../hooks/useNotebookChat'

// Out of daily chat messages is not out of the plan — the copy must not claim
// it is. Page checks only spend tokens, so the notebook has one message.
function introKey(source: QuotaOfferSource, reason: QuotaOfferReason): string {
  if (source === 'notebook') return 'notebookQuotaExhaustedBody'
  return reason === 'messages' ? 'chatQuotaMessagesBody' : 'chatViewQuotaExhaustedBody'
}

/**
 * Fired on `window` when a notebook page check is turned away for quota, so
 * the notebook pane can show the offer where the student is working.
 */
export const NOTEBOOK_QUOTA_OFFER_EVENT = 'notebook-quota-offer'
export interface NotebookQuotaOfferDetail {
  reason: QuotaOfferReason
}

interface ChatUpgradeOfferProps {
  source: QuotaOfferSource
  reason: QuotaOfferReason
  /** Called when the student takes the "continue without" link. */
  onContinue?: () => void
}

/**
 * The chat-view quota card, compact, shown once the AI quota runs out: as the
 * side chat's last message (nothing is blocked — the conversation above stays
 * scrollable), and in the notebook's popup after a rejected page check.
 */
export function ChatUpgradeOffer({ source, reason, onContinue }: ChatUpgradeOfferProps) {
  const t = useTranslations('courses')
  const { user } = useCurrentUser()
  const currentTier = getUserTierSlug(user as { currentTier?: string | null } | null)
  const isNotebook = source === 'notebook'

  return (
    <UpgradeOfferCard
      // Remount on change so a new rejection shows the offer again instead of
      // the restricted note left by an earlier skip.
      key={`${source}-${reason}`}
      compact
      title={t(isNotebook ? 'notebookQuotaOfferTitle' : 'chatViewQuotaOfferTitle')}
      intro={t(introKey(source, reason))}
      continueLabel={t(isNotebook ? 'notebookQuotaContinueCta' : 'chatViewQuotaContinueCta')}
      restrictedLabel={t(isNotebook ? 'notebookQuotaRestrictedBody' : 'chatQuotaRestrictedBody')}
      currentTier={currentTier}
      onContinue={onContinue}
    />
  )
}
