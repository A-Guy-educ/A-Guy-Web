'use client'

import { Button } from '@/ui/web/components/button'
import { SystemLink } from '@/infra/loading/components/SystemLink'
import { Lock } from 'lucide-react'
import { useTranslations } from '@/ui/web/providers/I18n'

interface TierLockBubbleProps {
  /** Number of exercises still gated behind an upgrade. Rendered into the
   *  body copy via the `{count}` placeholder. */
  lockedCount: number
}

/**
 * Terminal bubble shown in place of the lesson-complete card when the chat
 * stream was clamped by the free-tier exercise gate. Mirrors the lock card
 * used by ExercisesPager (`tierLocked*` strings there) but speaks in the
 * chat-view namespace since the copy is tuned for the "preview done" moment
 * at the end of a stream, not an in-exercise lock.
 */
export function TierLockBubble({ lockedCount }: TierLockBubbleProps) {
  const t = useTranslations('courses')
  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/10 p-card-padding shadow-elevation-1 flex flex-col items-center text-center gap-content-gap">
      <div className="w-12 h-12 rounded-2xl bg-warning/20 flex items-center justify-center">
        <Lock className="w-6 h-6 text-warning" />
      </div>
      <div className="space-y-2 max-w-md">
        <h2 className="text-heading-sm font-bold text-foreground">{t('chatViewTierLockTitle')}</h2>
        <p className="text-body-md text-muted-foreground">
          {t('chatViewTierLockBody').replace('{count}', String(lockedCount))}
        </p>
      </div>
      <Button asChild size="lg" className="min-h-[44px]">
        <SystemLink href="/products">{t('chatViewTierLockCta')}</SystemLink>
      </Button>
    </div>
  )
}
