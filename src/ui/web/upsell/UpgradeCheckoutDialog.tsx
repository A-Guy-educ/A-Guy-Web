'use client'

import { Loader2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useTranslations } from '@/ui/web/providers/I18n'
import { TIER_PRICE_ILS, type TierSlug } from '@/lib/tiers'

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
 * Floating checkout overlay mirroring the chat-payment demo. Opens on top of
 * the lesson chat when the student picks an upgrade tier from the quota offer.
 * Submits to `/api/subscriptions/checkout` — the exact same endpoint the
 * `/subscriptions` page uses — and redirects to Tranzilla's hosted checkout
 * on success. Keeps the UI "floating" even though the final hop still
 * leaves the chat; iframe embedding of Tranzilla's `iframenew.php` can
 * replace this redirect later without changing the API contract.
 */
export function UpgradeCheckoutDialog({ tier, onClose }: UpgradeCheckoutDialogProps) {
  const t = useTranslations('upgradeDialog')
  const tSubs = useTranslations('subscriptions')
  const [state, setState] = useState<DialogState>({ kind: 'ready' })
  const closeRef = useRef<HTMLButtonElement>(null)

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
    setState({ kind: 'loading' })
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tier, offerSlug: 'default' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success || !data?.checkoutUrl) {
        setState({ kind: 'error', message: t('error') })
        return
      }
      window.location.href = data.checkoutUrl
    } catch {
      setState({ kind: 'error', message: t('error') })
    }
  }, [tier, t])

  const isLoading = state.kind === 'loading'

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
            {t('title')}
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

        <p className="mt-2 text-body-sm text-muted-foreground">{t('description')}</p>

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

        <button
          type="button"
          onClick={handlePay}
          disabled={isLoading}
          className="mt-4 flex w-full items-center justify-center gap-content-gap-xs rounded-xl bg-primary py-3 text-body-md font-bold text-primary-foreground shadow-elevation-2 transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-80"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('loading')}
            </>
          ) : (
            t('payButton')
          )}
        </button>

        <p className="mt-3 text-center text-body-xs text-muted-foreground">{t('secure')}</p>
      </section>
    </div>
  )
}
