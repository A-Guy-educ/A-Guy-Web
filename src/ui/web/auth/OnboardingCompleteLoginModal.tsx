'use client'

import { Rocket } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/web/components/dialog'
import { GoogleLoginButton } from '@/ui/web/auth/GoogleLoginButton'
import { useTranslations } from '@/ui/web/providers/I18n'

interface OnboardingCompleteLoginModalProps {
  isOpen: boolean
  returnTo: string
}

// Non-dismissible on purpose (#778): the user must complete OAuth to save the
// onboarding selections. Do not add a Close button, dismiss handler, or Skip
// link without re-litigating that flow.
export function OnboardingCompleteLoginModal({
  isOpen,
  returnTo,
}: OnboardingCompleteLoginModalProps) {
  const t = useTranslations('auth.onboardingComplete')

  return (
    <Dialog open={isOpen}>
      <DialogContent
        allowDismiss={false}
        className="rounded-3xl border border-border bg-card p-card-padding-lg text-center sm:max-w-md sm:rounded-3xl"
      >
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Rocket className="h-7 w-7" aria-hidden />
        </div>
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-heading-xl font-bold text-foreground">
            {t('title')}
          </DialogTitle>
          <DialogDescription className="mx-auto mt-2 max-w-xs text-body-sm text-muted-foreground">
            {t('descriptionRest')}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 flex flex-col items-center gap-3">
          <GoogleLoginButton
            returnTo={returnTo}
            label={t('primaryCta')}
            className="h-12 w-full rounded-xl border-2 text-body-md font-semibold"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
