'use client'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { getUserTierSlug } from '@/lib/tiers'
import { useTranslations } from '@/ui/web/providers/I18n'
import { UpgradeOfferCard } from '@/ui/web/upsell/UpgradeOfferCard'
import type { QuotaOfferSource } from '../hooks/useNotebookChat'

/**
 * The chat-view quota card, compact, as the side chat's last message once the
 * AI quota runs out. Nothing is blocked — the student can still scroll the
 * conversation above it. A rejected notebook page check gets notebook copy.
 */
export function ChatUpgradeOffer({ source }: { source: QuotaOfferSource }) {
  const t = useTranslations('courses')
  const { user } = useCurrentUser()
  const currentTier = getUserTierSlug(user as { currentTier?: string | null } | null)
  const isNotebook = source === 'notebook'

  return (
    <UpgradeOfferCard
      // Remount on source change so a notebook rejection after a skipped chat
      // offer shows the offer again instead of the old restricted note.
      key={source}
      compact
      title={t(isNotebook ? 'notebookQuotaOfferTitle' : 'chatViewQuotaOfferTitle')}
      intro={t(isNotebook ? 'notebookQuotaExhaustedBody' : 'chatViewQuotaExhaustedBody')}
      continueLabel={t(isNotebook ? 'notebookQuotaContinueCta' : 'chatViewQuotaContinueCta')}
      restrictedLabel={t(isNotebook ? 'notebookQuotaRestrictedBody' : 'chatQuotaRestrictedBody')}
      currentTier={currentTier}
    />
  )
}
