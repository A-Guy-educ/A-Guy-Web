'use client'

import { useEffect, useState } from 'react'

import type { SafeDestination } from '@/infra/auth/oauth_sanitize'
import { cn } from '@/infra/utils/ui'
import { Button } from '@/ui/web/components/button'
import { Input } from '@/ui/web/components/input'
import { Label } from '@/ui/web/components/label'
import { useTranslations } from '@/ui/web/providers/I18n'
import { sendWhatsAppCodeAction, verifyWhatsAppCodeAction } from './login_whatsapp-action'

const RESEND_COOLDOWN_SECONDS = 30

type Step = 'closed' | 'phone' | 'code'

/**
 * Phone + one-time-code login. Starts collapsed as a button matching the
 * Google one, opens to a phone field, then to the code the student received.
 */
export function WhatsAppLoginForm({
  returnTo,
  className,
}: {
  returnTo: SafeDestination
  className?: string
}) {
  const t = useTranslations('auth.whatsapp')
  const [step, setStep] = useState<Step>('closed')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  async function sendCode() {
    if (isLoading) return
    setError(null)
    setIsLoading(true)
    try {
      const result = await sendWhatsAppCodeAction({ phone })
      if (result.success) {
        setStep('code')
        setCode('')
        setResendIn(RESEND_COOLDOWN_SECONDS)
      } else {
        setError(t(`errors.${result.error}`))
      }
    } catch {
      setError(t('errors.unexpected'))
    } finally {
      setIsLoading(false)
    }
  }

  async function verifyCode() {
    if (isLoading) return
    setError(null)
    setIsLoading(true)
    try {
      const result = await verifyWhatsAppCodeAction({ phone, code, returnTo })
      if (result.success) {
        window.location.href = result.destination
        return
      }
      setError(t(`errors.${result.error}`))
      setIsLoading(false)
    } catch {
      setError(t('errors.unexpected'))
      setIsLoading(false)
    }
  }

  if (step === 'closed') {
    return (
      <button
        type="button"
        onClick={() => setStep('phone')}
        className={cn(
          'inline-flex items-center justify-center rounded text-body-sm font-medium',
          'bg-card text-card-foreground border border-border cursor-pointer',
          'transition-all duration-fast hover:scale-[1.03] hover:shadow-card hover:bg-muted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className,
        )}
      >
        <WhatsAppIcon className="me-2 h-5 w-5 text-success" />
        {t('continueWithWhatsApp')}
      </button>
    )
  }

  return (
    <form
      noValidate
      className="w-full space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        void (step === 'phone' ? sendCode() : verifyCode())
      }}
    >
      {step === 'phone' ? (
        <div className="space-y-1">
          <Label htmlFor="whatsapp-phone">{t('phoneLabel')}</Label>
          <Input
            id="whatsapp-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            dir="ltr"
            autoFocus
            placeholder="050-123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-body-sm text-muted-foreground">
            {t('codeSentTo').replace('{phone}', phone)}
          </p>
          <Label htmlFor="whatsapp-code">{t('codeLabel')}</Label>
          <Input
            id="whatsapp-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            autoFocus
            maxLength={6}
            className="tracking-widest text-center"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </div>
      )}

      {error && <p className="text-body-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {step === 'phone'
          ? isLoading
            ? t('sending')
            : t('sendCode')
          : isLoading
            ? t('verifying')
            : t('verify')}
      </Button>

      {step === 'code' && (
        <div className="flex items-center justify-between text-body-sm">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setStep('phone')
              setError(null)
            }}
          >
            {t('changeNumber')}
          </button>
          <button
            type="button"
            disabled={resendIn > 0 || isLoading}
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline disabled:no-underline disabled:opacity-60"
            onClick={() => void sendCode()}
          >
            {resendIn > 0 ? t('resendIn').replace('{seconds}', String(resendIn)) : t('resend')}
          </button>
        </div>
      )}
    </form>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  )
}
