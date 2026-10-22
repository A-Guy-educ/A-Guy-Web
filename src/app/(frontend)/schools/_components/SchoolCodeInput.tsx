'use client'

/**
 * School code (coupon) field. Same interaction as the product page's
 * CouponInput, but validates against the school-bound demo codes and can
 * report that a code belongs to a different school.
 *
 * @fileType component
 * @domain schools
 */

import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

import { Button } from '@/ui/web/components/button'
import { Input } from '@/ui/web/components/input'
import { useTranslations } from '@/ui/web/providers/I18n'

import type { SchoolCoupon } from '../_lib/demo-data'

interface SchoolCodeInputProps {
  id: string
  code: string
  /** The parent should clear `error` here so a stale message doesn't linger. */
  onCodeChange: (code: string) => void
  applied: SchoolCoupon | null
  isChecking: boolean
  error: 'invalid' | 'wrongSchool' | null
  onApply: () => void
  onRemove: () => void
}

export function SchoolCodeInput({
  id,
  code,
  onCodeChange,
  applied,
  isChecking,
  error,
  onApply,
  onRemove,
}: SchoolCodeInputProps) {
  const t = useTranslations('schoolSignup')

  if (applied) {
    return (
      <div className="flex items-center gap-content-gap-xs rounded-md border border-success/30 bg-success/10 px-3 py-3 text-body-sm text-success">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          {t('coupon.applied')
            .replace('{percent}', String(applied.percentOff))
            .replace('{code}', applied.code)}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="ms-auto text-body-xs text-muted-foreground underline transition-colors duration-normal hover:text-foreground"
        >
          {t('coupon.remove')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-content-gap-xs">
        <Input
          id={id}
          value={code}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onApply()
            }
          }}
          placeholder={t('coupon.placeholder')}
          disabled={isChecking}
          dir="ltr"
          className="h-12 font-mono uppercase tracking-wider"
          autoComplete="off"
        />
        <Button
          type="button"
          variant="outline"
          onClick={onApply}
          disabled={!code.trim() || isChecking}
          className="h-12 shrink-0 px-5"
        >
          {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : t('coupon.apply')}
        </Button>
      </div>
      {error ? (
        <p className="flex items-center gap-content-gap-xs text-body-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" aria-hidden />
          {error === 'wrongSchool' ? t('coupon.wrongSchool') : t('coupon.invalid')}
        </p>
      ) : null}
    </div>
  )
}
