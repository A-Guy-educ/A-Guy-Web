'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { Button } from '@/ui/web/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/web/components/dialog'
import { useI18n, useTranslations } from '@/ui/web/providers/I18n'
import {
  TIER_PRICE_ILS,
  TIER_RANK,
  getUserTierSlug,
  type ActiveSubscription,
  type TierSlug,
} from '@/lib/tiers'
import { CurrentPlanCta } from './CurrentPlanCta'

type OfferSlug = 'default' | 'intro3mo'

const KNOWN_OFFER_SLUGS: readonly OfferSlug[] = ['default', 'intro3mo']

function resolveOfferSlug(raw: string | null): OfferSlug {
  if (raw && (KNOWN_OFFER_SLUGS as readonly string[]).includes(raw)) {
    return raw as OfferSlug
  }
  return 'default'
}

const TIER_ACCENT: Record<TierSlug, string> = {
  free: 'hsl(217 10% 55%)',
  basic: 'hsl(217 91% 60%)',
  advanced: 'hsl(262 83% 58%)',
  premium: 'hsl(43 96% 56%)',
}

function formatIls(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

interface TierCardProps {
  tier: TierSlug
  /**
   * Shared age / Terms / Privacy consent flag hoisted to the page-level
   * `SubscriptionsCatalog`. False blocks `handleSubscribe` with a toast
   * instead of advancing to Tranzilla.
   */
  isConsented?: boolean
}

export function TierCard({ tier, isConsented = true }: TierCardProps) {
  const t = useTranslations('subscriptions')
  const tConsent = useTranslations('purchaseConsent')
  const { messages } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: isAuthLoading } = useCurrentUser()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false)

  const price = TIER_PRICE_ILS[tier]
  const isFree = tier === 'free'
  const isHighlighted = tier === 'advanced'
  const accent = TIER_ACCENT[tier]

  // "Current plan" is driven by the subscription row when one exists —
  // falling back to `user.currentTier` for the legacy / free / cancelled-and-
  // past-period case. activeSubscription is the admin-attached virtual on
  // /api/users/me (afterRead hook); null for users without an active sub.
  const activeSubscription = (user as { activeSubscription?: ActiveSubscription | null } | null)
    ?.activeSubscription
  const currentTier =
    activeSubscription?.tierSlug ?? getUserTierSlug(user as { currentTier?: string | null } | null)
  const isCurrent = currentTier === tier

  const offerSlug = resolveOfferSlug(searchParams?.get('offer') ?? null)

  // Features are an array in the i18n JSON — pulled directly from the raw
  // messages tree because the typed `t()` helper only resolves string leaves.
  const features = readFeatures(messages, tier)
  const footnote = readFootnote(messages, tier)

  const tierName = t(`tiers.${tier}.name`)
  const tagline = t(`tiers.${tier}.tagline`)
  const priceLabel = isFree ? t('freePriceLabel') : formatIls(price)

  // Branch for the primary CTA: fresh signup goes through bootstrap/tranzilla,
  // a tier change on an existing sub goes through admin's change-tier endpoint.
  // Hitting bootstrap on an existing sub returns admin's 409 "sub exists" (the
  // bug admin surfaced from prod); hitting change-tier without a sub id is a
  // non-starter. The split is driven solely by whether the user has an active
  // sub row at the moment of click.
  const hasExistingSub = !!activeSubscription?.id
  // Downgrade = clicking a tier BELOW the user's current one while subscribed.
  // Admin's change-tier endpoint rejects downgrades with a 400 (M2 part 2 is
  // the follow-up cycle-boundary cron). Rather than let the user click and
  // eat an error toast, grey the button out at the source and show the
  // "coming soon" hint next to the price.
  const isDowngrade = hasExistingSub && !isCurrent && TIER_RANK[tier] < TIER_RANK[currentTier]
  const canChangeTier = hasExistingSub && !isCurrent && !isDowngrade

  const handleSubscribe = async () => {
    if (!user) {
      const returnTo = encodeURIComponent('/subscriptions')
      router.push(`/login?returnTo=${returnTo}`)
      return
    }
    if (!isConsented) {
      toast.error(tConsent('requiredToast'))
      return
    }
    // Fresh signup → straight to Tranzilla checkout, no local confirmation
    // needed (the hosted iframe is itself the confirmation step). Tier change
    // on an existing sub → open the confirm dialog first so a mis-click
    // doesn't accidentally swap the recurring price.
    if (canChangeTier) {
      setIsUpgradeDialogOpen(true)
      return
    }
    setIsCheckingOut(true)
    try {
      await submitBootstrap(tier, offerSlug)
    } catch {
      toast.error(t('errors.checkoutFailed'))
      setIsCheckingOut(false)
    }
  }

  const handleConfirmUpgrade = async () => {
    if (!activeSubscription?.id) return
    setIsCheckingOut(true)
    try {
      await submitChangeTier(activeSubscription.id, tier)
      setIsUpgradeDialogOpen(false)
    } catch {
      toast.error(t('errors.checkoutFailed'))
      setIsCheckingOut(false)
    }
  }

  const submitBootstrap = async (targetTier: TierSlug, slug: OfferSlug) => {
    const res = await fetch('/api/subscriptions/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tier: targetTier, offerSlug: slug }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      // Admin's bootstrap returns 409 when the user already has an
      // active-or-pending sub. Covers two real cases: (a) they ARE still
      // active and should manage their sub, and (b) they just paid and
      // the webhook hasn't settled yet. Admin's suggestion is to default
      // to the "mid-payment" copy which reads fine for both — avoids an
      // extra GET to disambiguate on a path the user is already stuck in.
      if (res.status === 409) {
        toast.error(t('errors.subscriptionConflict'))
        setIsCheckingOut(false)
        return
      }
      const errorKey = data.error ?? 'checkoutFailed'
      const errorMap: Record<string, string> = {
        authentication_required: t('errors.authRequired'),
        invalid_tier: t('errors.invalidTier'),
        checkout_failed: t('errors.checkoutFailed'),
        payment_provider_not_configured: t('errors.providerNotConfigured'),
      }
      toast.error(errorMap[errorKey] ?? t('errors.checkoutFailed'))
      setIsCheckingOut(false)
      return
    }
    window.location.href = data.checkoutUrl
  }

  const submitChangeTier = async (subscriptionId: string, targetTier: TierSlug) => {
    const res = await fetch(
      `/api/subscriptions/${encodeURIComponent(subscriptionId)}/change-tier`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tierSlug: targetTier }),
      },
    )
    const data = (await res.json()) as { success?: boolean; error?: string }
    if (!res.ok || !data.success) {
      toast.error(describeChangeTierError(res.status, data?.error, t))
      setIsCheckingOut(false)
      return
    }
    toast.success(t('changeTierSuccess').replace('{tier}', tierName))
    // router.refresh() alone only re-runs server components — useCurrentUser
    // keeps its stale client-cached user doc, so the "current plan" footer
    // doesn't move to the new tier until a hard refresh. A full reload after
    // a short delay (long enough for the success toast to show) gives us the
    // whole post-mutation UI in one shot without any custom bus plumbing.
    setTimeout(() => window.location.reload(), 1200)
  }

  return (
    <>
      <article
        className="relative flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-elevation-1 transition-all duration-normal hover:-translate-y-0.5 hover:shadow-card-hover"
        style={{ borderTopWidth: '4px', borderTopColor: accent }}
      >
        {isHighlighted ? (
          <span
            className="absolute end-4 top-4 rounded-full bg-primary px-3 py-1 text-label font-bold text-primary-foreground"
            aria-label={t('mostPopular')}
          >
            {t('mostPopular')}
          </span>
        ) : null}

        <div className="flex flex-col gap-content-gap-sm p-card-padding">
          <div>
            <h2 className="text-heading-md font-black text-card-foreground">{tierName}</h2>
            <p className="mt-1 text-body-sm text-muted-foreground">{tagline}</p>
          </div>

          <div className="flex items-baseline gap-content-gap-xs">
            <span className="text-display-sm font-black text-foreground">{priceLabel}</span>
            {!isFree ? (
              <span className="text-body-sm text-muted-foreground">{t('perMonth')}</span>
            ) : null}
          </div>

          <ul className="mt-2 flex flex-col gap-content-gap-xs">
            {features.map((feature, i) => (
              <li
                key={i}
                className="flex items-start gap-content-gap-xs text-body-sm text-foreground"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {footnote ? <p className="mt-1 text-body-xs text-muted-foreground">{footnote}</p> : null}
        </div>

        {(() => {
          // Current plan gets a dedicated footer that owns its own cancel flow.
          // We hand it the full activeSubscription so it can derive the right
          // state (active with cancel link, cancelled-and-counting-down, etc.).
          if (isCurrent) {
            return (
              <div className="mt-auto border-t border-border/40 p-card-padding-sm">
                <CurrentPlanCta activeSubscription={activeSubscription} />
              </div>
            )
          }
          // Downgrade attempt — admin hasn't shipped the cycle-boundary
          // downgrade flow yet, so render a disabled "coming soon" CTA
          // instead of a live button that would just error on click.
          if (isDowngrade) {
            return (
              <div className="mt-auto border-t border-border/40 p-card-padding-sm">
                <Button disabled variant="outline" className="w-full h-12 font-bold">
                  {t('downgradeComingSoon')}
                </Button>
              </div>
            )
          }
          const cta = renderCta({
            isFree,
            isAuthLoading,
            isCheckingOut,
            hasUser: !!user,
            isChangingTier: canChangeTier,
            onSubscribe: handleSubscribe,
            labels: {
              continue: canChangeTier
                ? t('changeTierButton').replace('{tier}', tierName)
                : t('continueButton'),
              login: t('loginToSubscribe'),
              redirecting: t('redirecting'),
            },
          })
          // No CTA for the free-tier baseline when the user is on a paid plan —
          // skip the footer entirely so there's no empty bordered strip.
          if (cta === null) return null
          return <div className="mt-auto border-t border-border/40 p-card-padding-sm">{cta}</div>
        })()}
      </article>

      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('upgradeDialogTitle').replace('{tier}', tierName)}</DialogTitle>
            <DialogDescription>{t('upgradeDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-content-gap-xs sm:flex-row-reverse">
            <Button
              type="button"
              onClick={handleConfirmUpgrade}
              disabled={isCheckingOut}
              className="w-full font-bold sm:w-auto"
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t('redirecting')}
                </>
              ) : (
                t('upgradeConfirm')
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsUpgradeDialogOpen(false)}
              disabled={isCheckingOut}
              className="w-full font-bold sm:w-auto"
            >
              {t('upgradeKeep')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface CtaProps {
  isFree: boolean
  isAuthLoading: boolean
  isCheckingOut: boolean
  hasUser: boolean
  // True when the click will hit admin's change-tier endpoint instead of
  // bootstrap. Doesn't change rendering today — kept as a hook for e.g. a
  // different button variant on upgrade. The label switch is driven by
  // the caller via `labels.continue`.
  isChangingTier: boolean
  onSubscribe: () => void
  labels: {
    continue: string
    login: string
    redirecting: string
  }
}

function renderCta({
  isFree,
  isAuthLoading,
  isCheckingOut,
  hasUser,
  isChangingTier: _isChangingTier,
  onSubscribe,
  labels,
}: CtaProps) {
  if (isFree) {
    // Free tier when the user is on a paid plan — not actionable from here,
    // and showing another "Your current plan" button would duplicate the
    // label already on the user's real tier card.
    return null
  }

  if (isAuthLoading) {
    return (
      <Button disabled className="w-full h-12 font-bold">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    )
  }

  if (!hasUser) {
    return (
      <Button onClick={onSubscribe} className="w-full h-12 font-bold">
        {labels.login}
      </Button>
    )
  }

  return (
    <Button onClick={onSubscribe} disabled={isCheckingOut} className="w-full h-12 font-bold">
      {isCheckingOut ? (
        <>
          <Loader2 className="me-2 h-4 w-4 animate-spin" />
          {labels.redirecting}
        </>
      ) : (
        labels.continue
      )}
    </Button>
  )
}

function readFeatures(messages: Record<string, unknown>, tier: TierSlug): string[] {
  const subscriptions = messages.subscriptions as Record<string, unknown> | undefined
  const tiers = subscriptions?.tiers as Record<string, unknown> | undefined
  const tierEntry = tiers?.[tier] as Record<string, unknown> | undefined
  const features = tierEntry?.features
  return Array.isArray(features) ? features.filter((f): f is string => typeof f === 'string') : []
}

function readFootnote(messages: Record<string, unknown>, tier: TierSlug): string | null {
  const subscriptions = messages.subscriptions as Record<string, unknown> | undefined
  const tiers = subscriptions?.tiers as Record<string, unknown> | undefined
  const tierEntry = tiers?.[tier] as Record<string, unknown> | undefined
  const footnote = tierEntry?.footnote
  return typeof footnote === 'string' && footnote ? footnote : null
}

/**
 * Map admin's change-tier status + error body to a user-facing toast.
 * Mirrors the mapping in SubTestCard so both pages speak the same language.
 */
function describeChangeTierError(
  status: number,
  errorKey: string | undefined,
  t: (key: string) => string,
): string {
  const err = errorKey?.toLowerCase() ?? ''
  if (status === 400 && err.includes('downgrade')) return t('errors.downgradeNotSupported')
  if (status === 400) return t('errors.changeTierBadRequest')
  if (status === 409) return t('errors.changeTierHandoff')
  if (status === 502) return t('errors.changeTierProvider')
  return t('errors.changeTierFailed')
}
