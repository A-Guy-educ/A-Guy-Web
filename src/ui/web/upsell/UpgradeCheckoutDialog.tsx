'use client'

import { Loader2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { useTranslations } from '@/ui/web/providers/I18n'
import { TIER_PRICE_ILS, type ActiveSubscription, type TierSlug } from '@/lib/tiers'
import { PurchaseConsentCheckbox } from './PurchaseConsentCheckbox'

export interface UpgradeCheckoutDialogProps {
  /** Which tier the user picked in the offer card. */
  tier: TierSlug
  /** Called when the user dismisses the dialog without completing. */
  onClose: () => void
}

type DialogState = { kind: 'ready' } | { kind: 'loading' } | { kind: 'error'; message: string }

const CURRENCY_FORMAT = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/**
 * Floating checkout overlay rendered from the ChatView quota-exhaustion card.
 *
 * Two code paths based on the user's existing subscription state:
 *
 *   - **No active sub** → POST `/api/subscriptions/checkout` (bootstrap) and
 *     redirect to Tranzilla for the initial payment. Original flow.
 *   - **Has active sub** → PATCH `/api/subscriptions/[id]/change-tier`.
 *     Admin's change-tier endpoint doesn't charge in the moment; it just
 *     flips the tier and swaps the next-cycle recurring price. No Tranzilla
 *     redirect — we just close the dialog and hard-reload so useCurrentUser
 *     picks up the new tier.
 *
 * The quota card lives behind the chat and almost always fires for users
 * who already have a sub (free users hit a different gate). Pre-rewrite,
 * this dialog always hit bootstrap, so every chat upgrade attempt returned
 * admin's 409 "sub exists" and the user was stuck.
 */
export function UpgradeCheckoutDialog({ tier, onClose }: UpgradeCheckoutDialogProps) {
  const t = useTranslations('upgradeDialog')
  const tSubs = useTranslations('subscriptions')
  const { user } = useCurrentUser()
  const [state, setState] = useState<DialogState>({ kind: 'ready' })
  const [consent, setConsent] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  const activeSubscription = (user as { activeSubscription?: ActiveSubscription | null } | null)
    ?.activeSubscription
  // Only treat the sub as change-tier-eligible once admin has settled the
  // bootstrap row. A pending sub means the user clicked Continue elsewhere
  // and never finished paying — PATCH /change-tier would reject it, and
  // we'd rather route to bootstrap and surface the "mid-payment" toast.
  const settledSubscription =
    activeSubscription && activeSubscription.status !== 'pending' ? activeSubscription : null
  const existingSubId = settledSubscription?.id
  const isTierChange = !!existingSubId && settledSubscription?.tierSlug !== tier

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const price = TIER_PRICE_ILS[tier]
  const tierName = tSubs(`tiers.${tier}.name`)

  const handlePay = useCallback(async () => {
    // Tier change doesn't require the age/T&C consent re-check — the user
    // already consented at their original subscribe time. Keep the gate on
    // fresh signups only.
    if (!isTierChange && !consent) return
    setState({ kind: 'loading' })
    try {
      let res: Response
      if (isTierChange && existingSubId) {
        res = await fetch(`/api/subscriptions/${encodeURIComponent(existingSubId)}/change-tier`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ tierSlug: tier }),
        })
      } else {
        res = await fetch('/api/subscriptions/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ tier, offerSlug: 'default' }),
        })
      }
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
        checkoutUrl?: string
      }

      // Admin returns 409 on bootstrap when a sub already exists or a very
      // recent attempt is still pending. Surface the specific toast copy.
      if (res.status === 409) {
        setState({ kind: 'error', message: tSubs('errors.subscriptionConflict') })
        return
      }

      if (!res.ok || !data?.success) {
        setState({ kind: 'error', message: t('error') })
        return
      }

      if (isTierChange) {
        // Change-tier returns no checkoutUrl — admin just flipped the tier.
        // Close the dialog and reload after a short delay so useCurrentUser
        // picks up the new tier and the chat's quota check re-evaluates.
        onClose()
        setTimeout(() => window.location.reload(), 1200)
        return
      }

      if (!data.checkoutUrl) {
        setState({ kind: 'error', message: t('error') })
        return
      }
      window.location.href = data.checkoutUrl
    } catch {
      setState({ kind: 'error', message: t('error') })
    }
  }, [tier, t, tSubs, consent, isTierChange, existingSubId, onClose])

  const isLoading = state.kind === 'loading'
  // Copy switches with the mode. Fresh signup keeps the original "Complete
  // payment" wording; tier change uses the warmer "Yes, upgrade me" set that
  // the /subscriptions dialog uses.
  const headerTitle = isTierChange
    ? tSubs('upgradeDialogTitle').replace('{tier}', tierName)
    : t('title')
  const bodyText = isTierChange ? tSubs('upgradeDialogDescription') : t('description')
  const ctaText = isTierChange ? tSubs('upgradeConfirm') : t('payButton')
  const loadingText = isTierChange ? tSubs('redirecting') : t('loading')
  const canSubmit = !isLoading && (isTierChange || consent)

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-card-padding-sm animate-in fade-in-0"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-dialog-title"
        className="w-full max-w-md rounded-2xl bg-card shadow-elevation-4 p-card-padding-lg"
      >
        <header className="flex items-center justify-between">
          <h2 id="upgrade-dialog-title" className="text-heading-sm font-black text-card-foreground">
            {headerTitle}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-disabled disabled:cursor-not-allowed"
            aria-label={t('close')}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <p className="mt-2 text-body-sm text-muted-foreground">{bodyText}</p>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-muted/30 p-card-padding-sm">
          <div>
            <div className="text-body-md font-bold text-foreground">{tierName}</div>
            <div className="mt-0.5 text-body-xs text-muted-foreground">{t('recurringLabel')}</div>
          </div>
          <div className="text-heading-md font-black text-primary">
            {CURRENCY_FORMAT.format(price)}
          </div>
        </div>

        {state.kind === 'error' ? (
          <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-body-sm text-destructive">
            {state.message}
          </p>
        ) : null}

        {isTierChange ? null : (
          <PurchaseConsentCheckbox
            id="upgrade-dialog-consent"
            checked={consent}
            onCheckedChange={setConsent}
            disabled={isLoading}
            className="mt-4"
          />
        )}

        <button
          type="button"
          onClick={handlePay}
          disabled={!canSubmit}
          className="mt-4 flex w-full items-center justify-center gap-content-gap-xs rounded-xl bg-primary py-3 text-body-md font-bold text-primary-foreground shadow-elevation-2 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {loadingText}
            </>
          ) : (
            ctaText
          )}
        </button>

        <p className="mt-3 text-center text-body-xs text-muted-foreground">{t('secure')}</p>
      </section>
    </div>
  )
}
