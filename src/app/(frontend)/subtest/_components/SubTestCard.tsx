'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { Button } from '@/ui/web/components/button'
import { useTranslations } from '@/ui/web/providers/I18n'

export function SubTestCard() {
  const t = useTranslations('subtest')
  const router = useRouter()
  const { user, isLoading: isAuthLoading } = useCurrentUser()
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const handleCheckout = async () => {
    if (!user) {
      const returnTo = encodeURIComponent('/subtest')
      router.push(`/login?returnTo=${returnTo}`)
      return
    }
    setIsCheckingOut(true)
    try {
      const res = await fetch('/api/subscriptions/test-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(t('errors.checkoutFailed'))
        setIsCheckingOut(false)
        return
      }
      window.location.href = data.checkoutUrl
    } catch {
      toast.error(t('errors.checkoutFailed'))
      setIsCheckingOut(false)
    }
  }

  const ctaLabel = isAuthLoading
    ? null
    : !user
      ? t('loginToTest')
      : isCheckingOut
        ? t('redirecting')
        : t('continueButton')

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

        <div className="flex items-baseline gap-content-gap-xs">
          <span className="text-display-sm font-black text-foreground">₪1</span>
          <span className="text-body-sm text-muted-foreground">{t('oneTime')}</span>
        </div>

        <Button
          onClick={handleCheckout}
          disabled={isCheckingOut || isAuthLoading}
          className="w-full h-12 font-bold"
        >
          {isCheckingOut ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
          {ctaLabel}
        </Button>
      </div>
    </article>
  )
}
