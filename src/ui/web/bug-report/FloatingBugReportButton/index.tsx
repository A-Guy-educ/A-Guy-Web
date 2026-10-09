/**
 * FloatingBugReportButton
 *
 * Pill-shaped floating action button that opens the combined bug-report /
 * contact-us popover. Shows a paper-plane icon alongside a bug icon so the
 * affordance reads as "send us something — a bug or a note".
 *
 * Lifts above the mobile chat panel via the --mobile-chat-panel-h custom
 * property, same as the previous circular variant.
 *
 * @fileType component
 * @domain bug-report
 * @pattern floating-button
 */

'use client'

import { Bug, Send } from 'lucide-react'

import { useTranslations } from '@/ui/web/providers/I18n'

interface FloatingBugReportButtonProps {
  onClick: () => void
}

export function FloatingBugReportButton({ onClick }: FloatingBugReportButtonProps) {
  const t = useTranslations('bugReport')
  const label = t('buttonLabel')
  const tooltip = t('tooltip')

  return (
    <button
      onClick={onClick}
      style={{ bottom: 'calc(var(--mobile-chat-panel-h, 0px) + 1.5rem)' }}
      className="fixed right-6 z-[60] h-11 px-4 rounded-full bg-destructive text-destructive-foreground shadow-elevation-3 hover:scale-105 hover:bg-destructive/90 transition-all duration-normal flex items-center gap-content-gap-xs"
      aria-label={label}
      title={tooltip}
      data-testid="floating-bug-report-button"
    >
      <Send className="w-4 h-4 -scale-x-100" />
      <span className="text-destructive-foreground/60 text-body-sm">/</span>
      <Bug className="w-4 h-4" />
    </button>
  )
}
