'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { Button } from '@/ui/web/components/button'
import { useI18n, useTranslations } from '@/ui/web/providers/I18n'
import { TIER_INTRO_OFFER, TIER_PRICE_ILS, getUserTierSlug, type TierSlug } from '@/lib/tiers'

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
}

export function TierCard({ tier }: TierCardProps) {
  const t = useTranslations('subscriptions')
  const { messages } = useI18n()
  const router = useRouter()
  const { user, isLoading: isAuthLoading } = useCurrentUser()
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const price = TIER_PRICE_ILS[tier]
  const intro = TIER_INTRO_OFFER[tier]
  const isFree = tier === 'free'
  const isHighlighted = tier === 'advanced'
  const accent = TIER_ACCENT[tier]
  const currentTier = getUserTierSlug(user as { currentTier?: string | null } | null)
  const isCurrent = currentTier === tier

  // Features are an array in the i18n JSON — pulled directly from the raw
  // messages tree because the typed `t()` helper only resolves string leaves.
  const features = readFeatures(messages, tier)

  const tierName = t(`tiers.${tier}.name`)
  const tagline = t(`tiers.${tier}.tagline`)
  const priceLabel = isFree ? t('freePriceLabel') : formatIls(price)

  const handleSubscribe = async () => {
    if (!user) {
      const returnTo = encodeURIComponent('/subscriptions')
      router.push(`/login?returnTo=${returnTo}`)
      return
    }
    setIsCheckingOut(true)
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tier }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
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
    } catch {
      toast.error(t('errors.checkoutFailed'))
      setIsCheckingOut(false)
    }
  }

  return (
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
          {intro ? (
            <>
              <span className="text-display-sm font-black text-foreground">
                {formatIls(intro.introPriceIls)}
              </span>
              <span className="text-body-sm text-muted-foreground">{t('perMonth')}</span>
            </>
          ) : (
            <>
              <span className="text-display-sm font-black text-foreground">{priceLabel}</span>
              {!isFree ? (
                <span className="text-body-sm text-muted-foreground">{t('perMonth')}</span>
              ) : null}
            </>
          )}
        </div>
        {intro ? (
          <p className="text-body-sm text-muted-foreground">
            {t('introPrefix')
              .replace('{months}', String(intro.introMonths))
              .replace('{regular}', formatIls(price))}
          </p>
        ) : null}

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
      </div>

      {(() => {
        const cta = renderCta({
          isFree,
          isCurrent,
          isAuthLoading,
          isCheckingOut,
          hasUser: !!user,
          onSubscribe: handleSubscribe,
          labels: {
            currentPlan: t('currentPlan'),
            subscribe: t('subscribeButton'),
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
  )
}

interface CtaProps {
  isFree: boolean
  isCurrent: boolean
  isAuthLoading: boolean
  isCheckingOut: boolean
  hasUser: boolean
  onSubscribe: () => void
  labels: {
    currentPlan: string
    subscribe: string
    login: string
    redirecting: string
  }
}

function renderCta({
  isFree,
  isCurrent,
  isAuthLoading,
  isCheckingOut,
  hasUser,
  onSubscribe,
  labels,
}: CtaProps) {
  if (isCurrent) {
    return (
      <Button disabled variant="outline" className="w-full h-12 font-bold">
        {labels.currentPlan}
      </Button>
    )
  }

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

  return (
    <Button onClick={onSubscribe} disabled={isCheckingOut} className="w-full h-12 font-bold">
      {isCheckingOut ? (
        <>
          <Loader2 className="me-2 h-4 w-4 animate-spin" />
          {labels.redirecting}
        </>
      ) : hasUser ? (
        labels.subscribe
      ) : (
        labels.login
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
