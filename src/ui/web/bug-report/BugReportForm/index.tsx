/**
 * BugReportForm
 *
 * Floating popover that opens when the user taps the floating pill. Houses two
 * tabs — "Bug" (default) and "Contact" — that share the same description +
 * contact-email form but route to different email subjects on the server.
 *
 * Localization: all visible strings come from the `bugReport` i18n namespace;
 * the popover respects the active locale's text direction via the I18n
 * provider's `useLocale()` hook.
 *
 * @fileType component
 * @domain bug-report
 * @pattern floating-form
 */

'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Bug, Loader2, Mail, Send, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { useLocale, useTranslations } from '@/ui/web/providers/I18n'
import { cn } from '@/infra/utils/ui'

import { useBugReportForm, type BugReportKind } from '../hooks/useBugReportForm'

interface BugReportFormProps {
  isOpen: boolean
  onClose: () => void
}

export function BugReportForm({ isOpen, onClose }: BugReportFormProps) {
  const t = useTranslations('bugReport')
  const locale = useLocale()
  const isRtl = locale === 'he'

  const {
    kind,
    setKind,
    description,
    setDescription,
    contactEmail,
    setContactEmail,
    isSubmitting,
    canSubmit,
    submit,
    reset,
  } = useBugReportForm({
    successMessage: t('success'),
    errorMessage: t('error'),
    rateLimitedMessage: t('rateLimited'),
  })

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => textareaRef.current?.focus())
    } else {
      reset()
    }
  }, [isOpen, reset])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!canSubmit) return
    const result = await submit()
    if (result.ok) {
      toast.success(t('success'))
      onClose()
    } else if (result.rateLimited) {
      toast.error(t('rateLimited'))
    } else {
      toast.error(t('error'))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isBug = kind === 'bug'
  const title = isBug ? t('title') : t('contactTitle')
  const subtitle = isBug ? t('subtitle') : t('contactSubtitle')
  const descriptionLabel = isBug ? t('descriptionLabel') : t('contactMessageLabel')
  const descriptionPlaceholder = isBug
    ? t('descriptionPlaceholder')
    : t('contactMessagePlaceholder')

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-24 right-6 z-[70] w-[400px] max-w-[calc(100vw-2rem)] bg-card rounded-2xl border border-border shadow-modal overflow-hidden flex flex-col"
          dir={isRtl ? 'rtl' : 'ltr'}
          data-testid="bug-report-form"
        >
          <div className="flex items-center justify-between p-card-padding border-b border-border bg-card">
            <div className="flex items-center gap-content-gap-xs">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  isBug ? 'bg-destructive/10' : 'bg-primary/10',
                )}
              >
                {isBug ? (
                  <Bug className="w-4 h-4 text-destructive" />
                ) : (
                  <Mail className="w-4 h-4 text-primary" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-body-sm">{title}</h3>
                <p className="text-body-xs text-muted-foreground">{subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              aria-label={t('close')}
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="px-card-padding pt-3">
            <div
              role="tablist"
              className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground"
            >
              <TabButton
                kind="bug"
                active={isBug}
                onSelect={setKind}
                label={t('tabBug')}
                icon={<Bug className="w-3.5 h-3.5" />}
              />
              <TabButton
                kind="contact"
                active={!isBug}
                onSelect={setKind}
                label={t('tabContact')}
                icon={<Mail className="w-3.5 h-3.5" />}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-card-padding space-y-4" noValidate>
            <div className="space-y-1.5">
              <label
                htmlFor="bug-report-description"
                className="block text-body-sm font-medium text-foreground"
              >
                {descriptionLabel}
              </label>
              <textarea
                id="bug-report-description"
                ref={textareaRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={descriptionPlaceholder}
                rows={4}
                required
                minLength={5}
                disabled={isSubmitting}
                className={cn(
                  'w-full bg-muted rounded-lg px-3 py-2 text-body-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 resize-none',
                  isBug ? 'focus:ring-destructive/50' : 'focus:ring-primary/50',
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="bug-report-email"
                className="block text-body-sm font-medium text-foreground"
              >
                {t('emailLabel')}
              </label>
              <input
                id="bug-report-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                disabled={isSubmitting}
                className={cn(
                  'w-full bg-muted rounded-lg px-3 py-2 text-body-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2',
                  isBug ? 'focus:ring-destructive/50' : 'focus:ring-primary/50',
                )}
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'w-full h-10 rounded-lg flex items-center justify-center gap-content-gap-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                isBug
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-body-sm font-medium">{t('sending')}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span className="text-body-sm font-medium">{t('submit')}</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface TabButtonProps {
  kind: BugReportKind
  active: boolean
  onSelect: (kind: BugReportKind) => void
  label: string
  icon: React.ReactNode
}

function TabButton({ kind, active, onSelect, label, icon }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onSelect(kind)}
      className={cn(
        'flex-1 inline-flex items-center justify-center gap-1.5 h-7 rounded-md text-body-xs font-medium transition-all duration-fast',
        active
          ? 'bg-background text-foreground shadow-elevation-1'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
