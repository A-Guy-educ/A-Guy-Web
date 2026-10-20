'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { Button } from '@/ui/web/components/button'
import { useTranslations } from '@/ui/web/providers/I18n'
import type { ActiveSubscription, TierSlug } from '@/lib/tiers'

const TEST_TIERS: readonly TierSlug[] = ['basic', 'advanced', 'premium']

/**
 * Test prices per tier for the `test` offer. Keep in sync with admin's
 * `tier-tranzilla-pricing.ts` — admin resolves + snapshots the real price at
 * bootstrap, so these numbers are display-only. If admin changes them, update
 * here for honesty.
 *
 * All current test prices sit above admin's ₪1 charge-floor, so upgrades DO
 * fire a real Tranzilla charge (admin PR #664's below-₪1 skip no longer
 * triggers for these). The skip-branch in the success toast stays wired as
 * future-proofing in case admin adds a sub-shekel offer later.
 */
const TEST_TIER_PRICE_LABEL: Record<TierSlug, string> = {
  free: '—',
  basic: '₪1.50',
  advanced: '₪3.00',
  premium: '₪4.50',
}

const TIER_LABEL: Record<TierSlug, string> = {
  free: 'Free',
  basic: 'Basic',
  advanced: 'Advanced',
  premium: 'Premium',
}

export function SubTestCard() {
  const t = useTranslations('subtest')
  const router = useRouter()
  const { user, isLoading: isAuthLoading } = useCurrentUser()
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const activeSubscription = (user as { activeSubscription?: ActiveSubscription | null } | null)
    ?.activeSubscription
  const hasActiveSub = !!activeSubscription?.id

  const requireLogin = () => {
    const returnTo = encodeURIComponent('/subtest')
    router.push(`/login?returnTo=${returnTo}`)
  }

  const subscribe = async (tier: TierSlug) => {
    if (!user) return requireLogin()
    setPendingAction(`subscribe:${tier}`)
    try {
      const res = await fetch('/api/subscriptions/test-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tier }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(describeBootstrapError(res.status, data?.error, t))
        setPendingAction(null)
        return
      }
      window.location.href = data.checkoutUrl
    } catch {
      toast.error(t('errors.checkoutFailed'))
      setPendingAction(null)
    }
  }

  const changeTier = async (tier: TierSlug) => {
    if (!activeSubscription?.id) return
    setPendingAction(`change:${tier}`)
    try {
      const res = await fetch(
        `/api/subscriptions/${encodeURIComponent(activeSubscription.id)}/change-tier`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ tierSlug: tier }),
        },
      )
      const data = (await res.json()) as {
        success?: boolean
        error?: string
        currentPeriodEnd?: string
        upgradeChargeIndex?: string | null
      }
      if (!res.ok || !data.success) {
        toast.error(describeChangeTierError(res.status, data?.error, t))
        setPendingAction(null)
        return
      }
      toast.success(buildChangeTierSuccessMessage({ tier, data, t }))
      setPendingAction(null)
      router.refresh()
    } catch {
      toast.error(t('errors.changeTierFailed'))
      setPendingAction(null)
    }
  }

  const cancel = async () => {
    if (!activeSubscription?.id) return
    setPendingAction('cancel')
    try {
      const res = await fetch(
        `/api/subscriptions/${encodeURIComponent(activeSubscription.id)}/cancel`,
        { method: 'PATCH', credentials: 'include' },
      )
      const data = await res.json()
      if (!res.ok || !data?.success) {
        toast.error(describeCancelError(res.status, t))
        setPendingAction(null)
        return
      }
      toast.success(t('cancelSuccess'))
      setPendingAction(null)
      router.refresh()
    } catch {
      toast.error(t('errors.cancelFailed'))
      setPendingAction(null)
    }
  }

  return (
    <article className="relative overflow-hidden rounded-lg border border-border bg-card shadow-elevation-1">
      <div className="flex flex-col gap-content-gap p-card-padding">
        <div>
          <span className="inline-flex items-center rounded-full bg-warning/10 px-3 py-1 text-label font-bold text-warning">
            {t('testBadge')}
          </span>
          <h1 className="mt-3 text-heading-lg font-black text-card-foreground">{t('title')}</h1>
          <p className="mt-2 text-body-sm text-muted-foreground">{t('description')}</p>
        </div>

        {!user && !isAuthLoading ? (
          <Button onClick={requireLogin} className="w-full h-12 font-bold">
            {t('loginToTest')}
          </Button>
        ) : null}

        {user && !hasActiveSub ? (
          <TierButtonRow
            heading={t('subscribeHeading')}
            tiers={TEST_TIERS}
            label={(tier) => `${TIER_LABEL[tier]} — ${TEST_TIER_PRICE_LABEL[tier]}`}
            busyKey={(tier) => `subscribe:${tier}`}
            pendingAction={pendingAction}
            onClick={subscribe}
            disabledForTier={() => false}
            isAuthLoading={isAuthLoading}
          />
        ) : null}

        {user && hasActiveSub && activeSubscription ? (
          <>
            <CurrentSubBlock sub={activeSubscription} t={t} />
            <TierButtonRow
              heading={t('changeTierHeading')}
              hint={t('changeTierTestNote')}
              tiers={TEST_TIERS}
              label={(tier) => `${t('switchTo')} ${TIER_LABEL[tier]}`}
              busyKey={(tier) => `change:${tier}`}
              pendingAction={pendingAction}
              onClick={changeTier}
              disabledForTier={(tier) => tier === activeSubscription.tierSlug}
              isAuthLoading={isAuthLoading}
            />
            <Button
              onClick={cancel}
              variant="destructive"
              disabled={pendingAction !== null || isAuthLoading}
              className="w-full h-12 font-bold"
            >
              {pendingAction === 'cancel' ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('cancelButton')}
            </Button>
          </>
        ) : null}
      </div>
    </article>
  )
}

interface TierButtonRowProps {
  heading: string
  hint?: string
  tiers: readonly TierSlug[]
  label: (tier: TierSlug) => string
  busyKey: (tier: TierSlug) => string
  pendingAction: string | null
  onClick: (tier: TierSlug) => void
  disabledForTier: (tier: TierSlug) => boolean
  isAuthLoading: boolean
}

function TierButtonRow({
  heading,
  hint,
  tiers,
  label,
  busyKey,
  pendingAction,
  onClick,
  disabledForTier,
  isAuthLoading,
}: TierButtonRowProps) {
  const anyPending = pendingAction !== null
  return (
    <div className="flex flex-col gap-content-gap-xs">
      <h2 className="text-body-sm font-bold text-foreground">{heading}</h2>
      {hint ? <p className="text-body-xs text-muted-foreground">{hint}</p> : null}
      {tiers.map((tier) => {
        const key = busyKey(tier)
        const isBusy = pendingAction === key
        const isDisabled = disabledForTier(tier)
        return (
          <Button
            key={tier}
            onClick={() => onClick(tier)}
            disabled={anyPending || isAuthLoading || isDisabled}
            variant={isDisabled ? 'outline' : 'default'}
            className="w-full h-12 font-bold"
          >
            {isBusy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
            {label(tier)}
          </Button>
        )
      })}
    </div>
  )
}

interface CurrentSubBlockProps {
  sub: ActiveSubscription
  t: (key: string) => string
}

function CurrentSubBlock({ sub, t }: CurrentSubBlockProps) {
  const tierLabel = sub.tierSlug ? TIER_LABEL[sub.tierSlug] : '—'
  const periodEnd = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toISOString().slice(0, 10)
    : null
  return (
    <div className="rounded-lg border border-border/60 bg-background p-card-padding-sm text-body-sm">
      <p className="font-bold text-foreground">
        {t('currentSubHeading').replace('{tier}', tierLabel)}
      </p>
      <p className="mt-1 text-muted-foreground">
        {t('currentSubStatus').replace('{status}', sub.status)}
      </p>
      {periodEnd ? (
        <p className="text-muted-foreground">
          {t('currentSubPeriodEnd').replace('{date}', periodEnd)}
        </p>
      ) : null}
      {sub.cancelAtPeriodEnd ? (
        <p className="mt-1 font-bold text-warning">{t('currentSubCancelling')}</p>
      ) : null}
    </div>
  )
}

function describeBootstrapError(
  status: number,
  errorKey: string | undefined,
  t: (key: string) => string,
): string {
  if (status === 409) return t('errors.subscriptionExists')
  if (status === 400 && errorKey?.includes('offer')) return t('errors.offerNotAvailable')
  return t('errors.checkoutFailed')
}

function describeChangeTierError(
  status: number,
  errorKey: string | undefined,
  t: (key: string) => string,
): string {
  const err = errorKey?.toLowerCase() ?? ''
  if (status === 400 && err.includes('downgrade')) return t('errors.downgradeNotSupported')
  if (status === 400) return t('errors.changeTierBadRequest')
  if (status === 409) return t('errors.changeTierHandoff')
  // Admin's PR #664 introduced three distinct 502s on the upgrade-charge path.
  // Match on keywords from admin's canonical error strings so each surfaces a
  // user-actionable toast — a declined card needs the user to fix their card,
  // a provider outage is just "try again later."
  if (status === 502 && err.includes('declin')) return t('errors.changeTierCardDeclined')
  if (status === 502 && (err.includes('reach') || err.includes('unreachable'))) {
    return t('errors.changeTierProviderUnreachable')
  }
  if (status === 502) return t('errors.changeTierProvider')
  // 500 "Subscription has no stored card" — admin flagged this as a rare
  // state-corruption fallback: the user has an active sub row but no token
  // we can charge. Only recovery is cancel + fresh signup.
  if (status === 500 && err.includes('stored card')) return t('errors.changeTierNoStoredCard')
  return t('errors.changeTierFailed')
}

/**
 * Compose the success toast from admin's PR #664 response fields. Charge is
 * skipped on sub-shekel test flows (admin's below-₪1 guard), which is a
 * useful signal when verifying the test matrix — the user's tier flipped
 * but no transactions row got written. The success message surfaces that
 * explicitly so it's not confused with a broken write path.
 */
function buildChangeTierSuccessMessage({
  tier,
  data,
  t,
}: {
  tier: TierSlug
  data: { currentPeriodEnd?: string; upgradeChargeIndex?: string | null }
  t: (key: string) => string
}): string {
  const base = t('changeTierSuccess').replace('{tier}', TIER_LABEL[tier])
  const periodEnd = data.currentPeriodEnd
    ? new Date(data.currentPeriodEnd).toISOString().slice(0, 10)
    : null
  const chargeSkipped = data.upgradeChargeIndex === null
  const parts = [base]
  if (periodEnd) parts.push(t('changeTierRenewsOn').replace('{date}', periodEnd))
  if (chargeSkipped) parts.push(t('changeTierChargeSkipped'))
  return parts.join(' • ')
}

function describeCancelError(status: number, t: (key: string) => string): string {
  if (status === 409) return t('errors.cancelHandoff')
  if (status === 502) return t('errors.cancelProvider')
  return t('errors.cancelFailed')
}
