'use client'

import { useEffect, useRef } from 'react'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { cn } from '@/infra/utils/ui'
import { getUserTierSlug, type TierSlug } from '@/lib/tiers'
import { ChatQuotaBar } from '@/ui/web/chat/ChatQuotaBar'
import { useChatQuota } from '@/ui/web/chat/hooks/useChatQuota'
import { useTranslations } from '@/ui/web/providers/I18n'
import { UpgradeOfferCard } from '@/ui/web/upsell/UpgradeOfferCard'

export interface ChatViewQuota {
  used: number
  max: number
  resetAt: string | null
  exhausted: boolean
  currentTier: TierSlug
}

/**
 * The student's AI quota for the chat view's input panel. `null` for guests,
 * admins and unlimited tiers — nothing to show. Refreshes after every AI
 * request settles, since each one (typed or automatic) uses a message.
 */
export function useChatViewQuota(isSending: boolean, rejected: boolean): ChatViewQuota | null {
  const { user } = useCurrentUser()
  const quota = useChatQuota()
  const { refreshQuota } = quota
  const wasSending = useRef(false)

  useEffect(() => {
    if (wasSending.current && !isSending) void refreshQuota()
    wasSending.current = isSending
  }, [isSending, refreshQuota])

  const isAdmin = (user as { role?: string } | null)?.role === 'admin'
  if (!user || isAdmin || !quota.isLoaded) return null
  if (quota.maxQuestions >= Number.MAX_SAFE_INTEGER && !rejected) return null
  return {
    used: quota.questionsUsed,
    max: quota.maxQuestions,
    resetAt: quota.resetAt,
    exhausted: rejected || quota.isLimitReached,
    currentTier: getUserTierSlug(user as { currentTier?: string | null }),
  }
}

/** Messages left, on the fold chevron — the limit stays visible while folded. */
export function ChatInputQuotaBadge({ quota }: { quota: ChatViewQuota }) {
  const t = useTranslations('courses')
  if (quota.max >= Number.MAX_SAFE_INTEGER) return null
  const left = quota.exhausted ? 0 : Math.max(0, quota.max - quota.used)
  const low = left <= Math.ceil(quota.max * 0.2)
  const label = t('chatViewQuotaRemaining').replace('{left}', String(left))

  return (
    <span
      aria-label={label}
      title={label}
      className={cn(
        'absolute -top-1.5 -end-1.5 min-w-5 h-5 px-1 rounded-full text-body-2xs font-bold',
        'flex items-center justify-center tabular-nums shadow-elevation-1',
        low ? 'bg-warning text-warning-foreground' : 'bg-primary text-primary-foreground',
      )}
    >
      {left}
    </span>
  )
}

/**
 * Shown above the input pill while it's unfolded: the usage bar, plus the
 * upgrade offer once the cap is hit. Lives in the input panel rather than the
 * lesson stream so a folded panel keeps the lesson clear.
 */
export function ChatInputQuotaStatus({
  quota,
  onSkip,
}: {
  quota: ChatViewQuota
  onSkip: () => void
}) {
  const t = useTranslations('courses')

  return (
    <div className="mb-2 flex flex-col gap-content-gap-xs">
      {quota.exhausted && (
        <div className="max-h-[45vh] overflow-y-auto rounded-2xl bg-background">
          <UpgradeOfferCard
            compact
            title={t('chatViewQuotaOfferTitle')}
            intro={t('chatViewQuotaExhaustedBody')}
            continueLabel={t('chatViewQuotaContinueCta')}
            restrictedLabel={t('chatViewQuotaRestrictedBody')}
            currentTier={quota.currentTier}
            onContinue={onSkip}
          />
        </div>
      )}
      {quota.max < Number.MAX_SAFE_INTEGER && (
        <div className="self-start rounded-full border border-border bg-card/95 px-3 py-1 backdrop-blur-md">
          <ChatQuotaBar
            questionsUsed={quota.used}
            maxQuestions={quota.max}
            resetAt={quota.resetAt}
          />
        </div>
      )}
    </div>
  )
}
