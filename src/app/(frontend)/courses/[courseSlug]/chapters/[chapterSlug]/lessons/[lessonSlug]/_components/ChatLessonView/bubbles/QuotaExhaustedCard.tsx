'use client'

import { useTranslations } from '@/ui/web/providers/I18n'
import { UpgradeOfferCard } from '@/ui/web/upsell/UpgradeOfferCard'

interface QuotaExhaustedCardProps {
  /** Intro copy under the headline — passed in from `chatViewQuotaExhaustedBody`. */
  bodyText: string
  /** Label for the "continue without AI" skip link. */
  continueLabel: string
}

/**
 * One-time card rendered when the student's chat quota runs out. Replaces the
 * earlier single-CTA layout with the chat-payment demo layout: title + intro +
 * two plan buttons (basic + advanced) + a "continue without AI" skip link.
 * Picking a plan opens the floating `UpgradeCheckoutDialog`, which submits to
 * the same `/api/subscriptions/checkout` endpoint `/subscriptions` uses — so
 * payment stays consistent whether the student started from the catalog page
 * or hit the quota wall mid-lesson.
 */
export function QuotaExhaustedCard({ bodyText, continueLabel }: QuotaExhaustedCardProps) {
  const t = useTranslations('coursePage')
  return (
    <UpgradeOfferCard
      title={t('chatViewQuotaOfferTitle')}
      intro={bodyText}
      continueLabel={continueLabel}
      restrictedLabel={t('chatViewQuotaRestrictedBody')}
      onContinue={() => {
        /* Parent `useChatChannel` already suppresses AI calls once the quota
         *  flag is set — the skip is a UX acknowledgment, not a state wipe. */
      }}
    />
  )
}
