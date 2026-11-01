'use client'

import { Gauge } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { useSubscriptionsHref } from '@/client/hooks/useSubscriptionsHref'
import { TOKEN_USAGE_CHANGED_EVENT } from '@/client/utils/token-usage-signal'
import { SystemLink } from '@/infra/loading/components/SystemLink'
import { cn } from '@/infra/utils/ui'
import { getUserTierSlug } from '@/lib/tiers'
import {
  pickTokenUsageAlert,
  type TokenUsageAlert as TokenUsageAlertData,
  type TokenUsageSnapshot,
} from '@/lib/tiers/token-usage-alert'
import { Button } from '@/ui/web/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/web/components/dialog'
import { useI18n, useTranslations } from '@/ui/web/providers/I18n'

const USAGE_ENDPOINT = '/api/users/me/token-usage'
const SEEN_STORAGE_PREFIX = 'token-usage-alerts:'
// Two windows × two thresholds per period; a short history is plenty.
const MAX_SEEN_KEYS = 24

function readSeen(userId: string): string[] {
  try {
    const raw = window.localStorage.getItem(`${SEEN_STORAGE_PREFIX}${userId}`)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : []
  } catch {
    return []
  }
}

function writeSeen(userId: string, keys: string[]): void {
  try {
    window.localStorage.setItem(
      `${SEEN_STORAGE_PREFIX}${userId}`,
      JSON.stringify(keys.slice(-MAX_SEEN_KEYS)),
    )
  } catch {
    // Storage blocked (private mode) — the alert may repeat; harmless.
  }
}

function formatReset(resetAt: string, window: TokenUsageAlertData['window'], locale: string) {
  const options: Intl.DateTimeFormatOptions =
    window === 'daily' ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'long' }
  return new Intl.DateTimeFormat(locale, options).format(new Date(resetAt))
}

/**
 * Popup shown when the signed-in student crosses 50% or 90% of their daily
 * or monthly AI token budget. Checks once on mount and again whenever a chat
 * surface fires `TOKEN_USAGE_CHANGED_EVENT`, and after each dismiss. Each alert shows once per
 * window (see `pickTokenUsageAlert`); "seen" lives in localStorage per user.
 */
export function TokenUsageAlert({ userId }: { userId: string }) {
  const t = useTranslations('tokenUsageAlert')
  const { locale } = useI18n()
  const { user } = useCurrentUser()
  const subscribeHref = useSubscriptionsHref()
  const [alert, setAlert] = useState<TokenUsageAlertData | null>(null)
  const inFlightRef = useRef(false)
  const isOpenRef = useRef(false)

  const check = useCallback(async () => {
    if (inFlightRef.current || isOpenRef.current) return
    inFlightRef.current = true
    try {
      const res = await fetch(USAGE_ENDPOINT, { cache: 'no-store', credentials: 'include' })
      if (!res.ok) return
      const body = (await res.json()) as { success?: boolean; data?: TokenUsageSnapshot }
      if (!body.success || !body.data) return

      const seen = readSeen(userId)
      const next = pickTokenUsageAlert(body.data, (key) => seen.includes(key))
      if (!next) return
      // Record before showing so a reload mid-dialog doesn't repeat it.
      writeSeen(userId, [...seen, ...next.keys])
      isOpenRef.current = true
      setAlert(next)
    } catch {
      // Usage alerts are a nudge — a failed check just waits for the next turn.
    } finally {
      inFlightRef.current = false
    }
  }, [userId])

  useEffect(() => {
    void check()
    const onChange = () => void check()
    window.addEventListener(TOKEN_USAGE_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(TOKEN_USAGE_CHANGED_EVENT, onChange)
  }, [check])

  const close = useCallback(() => {
    isOpenRef.current = false
    setAlert(null)
  }, [])

  // Only one alert shows at a time, so another window that crossed a threshold
  // in the same turn (or while this was open) is queued behind it. Re-check on
  // dismiss, or it waits for the next turn — which may already be at 100% and
  // skip it. Not on "View plans": they're leaving for the plans page.
  const dismiss = useCallback(() => {
    close()
    void check()
  }, [close, check])

  if (!alert) return null

  const isHigh = alert.threshold >= 90
  const canUpgrade = getUserTierSlug(user as { currentTier?: string | null } | null) !== 'premium'
  const resetLine = alert.resetAt
    ? t(`resets.${alert.window}`).replace(
        '{time}',
        formatReset(alert.resetAt, alert.window, locale),
      )
    : null

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : dismiss())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div
            className={cn(
              'mb-2 flex h-12 w-12 items-center justify-center rounded-2xl',
              isHigh ? 'bg-warning/15 text-warning' : 'bg-primary/10 text-primary',
            )}
          >
            <Gauge className="h-6 w-6" aria-hidden />
          </div>
          <DialogTitle>
            {t(`title.${alert.window}`).replace('{percent}', String(alert.threshold))}
          </DialogTitle>
          <DialogDescription>
            {t(isHigh ? 'bodyHigh' : 'bodyHalf')}
            {resetLine ? ` ${resetLine}` : null}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-content-gap-xs sm:flex-row-reverse">
          {canUpgrade ? (
            <Button asChild className="w-full font-bold sm:w-auto">
              <SystemLink href={subscribeHref} onClick={close}>
                {t('upgradeCta')}
              </SystemLink>
            </Button>
          ) : null}
          <Button
            type="button"
            variant={canUpgrade ? 'outline' : 'default'}
            onClick={dismiss}
            className="w-full font-bold sm:w-auto"
          >
            {t('dismiss')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
