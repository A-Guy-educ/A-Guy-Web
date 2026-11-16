'use client'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { getUserTierSlug } from '@/lib/tiers'
import { useTranslations } from '@/ui/web/providers/I18n'
import { UpgradeOfferCard } from '@/ui/web/upsell/UpgradeOfferCard'
import type { QuotaOfferReason, QuotaOfferSource } from '../hooks/useNotebookChat'

// Body copy per what hit the cap and which cap it was. Out of daily chat
// messages is not out of the plan — the copy must not claim it is.
const INTRO_KEYS: Record<QuotaOfferSource, Record<QuotaOfferReason, string>> = {
  chat: { messages: 'chatQuotaMessagesBody', tokens: 'chatViewQuotaExhaustedBody' },
  notebook: { messages: 'notebookQuotaMessagesBody', tokens: 'notebookQuotaExhaustedBody' },
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
}

/**
 * The chat-view quota card, compact, shown once the AI quota runs out: as the
 * side chat's last message, and in the notebook pane after a rejected page
 * check. Nothing is blocked — the student can still scroll what's above it.
 */
export function ChatUpgradeOffer({ source, reason }: ChatUpgradeOfferProps) {
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
      intro={t(INTRO_KEYS[source][reason])}
      continueLabel={t(isNotebook ? 'notebookQuotaContinueCta' : 'chatViewQuotaContinueCta')}
      restrictedLabel={t(isNotebook ? 'notebookQuotaRestrictedBody' : 'chatQuotaRestrictedBody')}
      currentTier={currentTier}
    />
  )
}
