'use client'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'

interface GatedWarningBannerProps {
  secondsRemaining: number
  onSignIn: () => void
}

export function GatedWarningBanner({ secondsRemaining, onSignIn }: GatedWarningBannerProps) {
  const t = useTranslations('accessControl')

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'bg-destructive/90 text-destructive-foreground',
        'px-4 py-2 text-center text-sm font-medium',
        'animate-in slide-in-from-top duration-300',
      )}
    >
      <span>{t('gatedWarningTitle')} </span>
      <span className="font-bold">
        {t('warningCountdown').replace('{{seconds}}', String(secondsRemaining))}
      </span>
      <button
        onClick={onSignIn}
        className="ml-3 underline font-semibold hover:opacity-80 transition-opacity"
      >
        {t('signInPrompt')}
      </button>
    </div>
  )
}
