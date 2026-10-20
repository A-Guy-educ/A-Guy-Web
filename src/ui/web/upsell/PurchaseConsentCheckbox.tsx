'use client'

/**
 * Required-consent checkbox that gates every path into Tranzilla checkout —
 * the UpgradeCheckoutDialog (chat quota upsell) and the /subscriptions tier
 * cards both render this and only submit when `checked` is true.
 *
 * The label combines a self/guardian/18+ attestation with an acceptance of
 * the Terms of Service and Privacy Policy. Those two links open the hosted
 * legal pages the footer already points at, so the student can read before
 * paying without losing their place in the checkout flow (middle-click or
 * ⌘-click to new tab preserves checkout state; a plain click navigates away
 * and the student restarts the upgrade — accepted trade-off, the legal pages
 * are short).
 *
 * @fileType component
 * @domain subscriptions
 */

import { SystemLink } from '@/infra/loading/components/SystemLink'
import { useTranslations } from '@/ui/web/providers/I18n'
import { Checkbox } from '@/ui/web/components/checkbox'
import { cn } from '@/infra/utils/ui'

interface PurchaseConsentCheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  /**
   * Stable DOM id so the surrounding form / dialog can wire aria-describedby
   * and the label's `htmlFor` to the checkbox without colliding when two
   * instances mount on the same page.
   */
  id?: string
}

export function PurchaseConsentCheckbox({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  id = 'purchase-consent',
}: PurchaseConsentCheckboxProps) {
  const t = useTranslations('purchaseConsent')
  const tLegal = useTranslations('legal')

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex gap-content-gap-xs items-start text-body-xs text-muted-foreground cursor-pointer select-none',
        disabled && 'opacity-disabled cursor-not-allowed',
        className,
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next === true)}
        disabled={disabled}
        className="mt-0.5"
      />
      <span className="leading-relaxed">
        {t('ageAndGuardian')} {t('readAndAgreePrefix')}
        <SystemLink
          href="/terms-of-service"
          onClick={(e) => e.stopPropagation()}
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          {tLegal('termsOfService')}
        </SystemLink>
        {t('readAndAgreeConnector')}
        <SystemLink
          href="/privacy-policy"
          onClick={(e) => e.stopPropagation()}
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          {tLegal('privacyPolicy')}
        </SystemLink>
        {t('readAndAgreeSuffix')}
      </span>
    </label>
  )
}
