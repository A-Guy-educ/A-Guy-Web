'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/ui/web/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/web/components/dialog'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'
import type { ActiveSubscription } from '@/lib/tiers'

interface CurrentPlanCtaProps {
  activeSubscription: ActiveSubscription | null | undefined
}

/**
 * CTA footer rendered on a TierCard that represents the user's current plan.
 *
 * Three visual states:
 *  - Active sub, not scheduled to cancel  → "Your current plan" + "Cancel" link
 *  - Cancelled, access until period end   → "Cancels on <date>" indicator
 *  - No activeSubscription row            → "Your current plan" only (legacy
 *    one-time users or free, nothing to cancel)
 */
export function CurrentPlanCta({ activeSubscription }: CurrentPlanCtaProps) {
  const t = useTranslations('subscriptions')
  const locale = useLocale()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const canCancel =
    activeSubscription &&
    activeSubscription.id &&
    (activeSubscription.status === 'active' || activeSubscription.status === 'past_due') &&
    !activeSubscription.cancelAtPeriodEnd

  const isCancelled =
    activeSubscription?.cancelAtPeriodEnd === true || activeSubscription?.status === 'cancelled'

  const formattedPeriodEnd = formatPeriodEnd(activeSubscription?.currentPeriodEnd, locale)

  const handleCancel = async () => {
    if (!activeSubscription?.id) return
    setIsCancelling(true)
    try {
      const res = await fetch(
        `/api/subscriptions/${encodeURIComponent(activeSubscription.id)}/cancel`,
        { method: 'PATCH', credentials: 'include' },
      )
      const data = (await res.json().catch(() => null)) as { success?: boolean } | null
      if (!res.ok || !data?.success) {
        // Admin's cancel endpoint has specific soft-retryable codes we surface
        // with a dedicated hint; everything else gets the generic fallback.
        if (res.status === 409) {
          toast.error(t('errors.cancelHandoff'))
        } else if (res.status === 502) {
          toast.error(t('errors.cancelProvider'))
        } else {
          toast.error(t('errors.cancelFailed'))
        }
        setIsCancelling(false)
        return
      }
      toast.success(t('cancelSuccess'))
      setIsDialogOpen(false)
      setIsCancelling(false)
      // Full reload after a short delay (long enough for the toast to show).
      // router.refresh() only re-runs server components; useCurrentUser keeps
      // its stale client-cached user doc, so the card wouldn't flip to
      // "Cancels on <date>" until a hard refresh.
      setTimeout(() => window.location.reload(), 1200)
    } catch {
      toast.error(t('errors.cancelFailed'))
      setIsCancelling(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-content-gap-xs">
        <Button disabled variant="outline" className="w-full h-12 font-bold">
          {isCancelled && formattedPeriodEnd
            ? t('cancelsOn').replace('{date}', formattedPeriodEnd)
            : t('currentPlan')}
        </Button>
        {canCancel ? (
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="text-body-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t('cancelButton')}
          </button>
        ) : null}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('cancelDialogTitle')}</DialogTitle>
            <DialogDescription>
              {formattedPeriodEnd
                ? t('cancelDialogDescription').replace('{date}', formattedPeriodEnd)
                : t('cancelDialogDescriptionNoDate')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-content-gap-xs sm:flex-row-reverse">
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancel}
              disabled={isCancelling}
              className="w-full font-bold sm:w-auto"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t('cancelInProgress')}
                </>
              ) : (
                t('cancelConfirm')
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isCancelling}
              className="w-full font-bold sm:w-auto"
            >
              {t('cancelKeep')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function formatPeriodEnd(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  try {
    return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}
