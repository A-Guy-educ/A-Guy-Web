'use client'

import { cn } from '@/infra/utils/ui'
import type { ReactNode } from 'react'

interface QuestionHeaderBadgesProps {
  /** 1-based exercise ordinal rendered as the first (number) badge. */
  exerciseOrdinal?: number
  /** Section letter (e.g. `א`, `ד3`) rendered as the second badge. */
  sectionLabel?: string
  /** Prompt / first-row content that the badges sit inline with. */
  children: ReactNode
}

/**
 * Puts the exercise-number + section-letter circles inline with the first
 * row of the prompt text — matching how the scroll view (ExerciseWorksheet)
 * draws its section letter next to the question content. Badges use
 * `items-start` + a small top offset so they align with the ascent of the
 * first text line even when the prompt wraps across several rows.
 *
 * Renders `children` straight when neither badge is provided, so callers
 * can thread the component unconditionally.
 */
export function QuestionHeaderBadges({
  exerciseOrdinal,
  sectionLabel,
  children,
}: QuestionHeaderBadgesProps) {
  const hasBadge = typeof exerciseOrdinal === 'number' || Boolean(sectionLabel)
  if (!hasBadge) return <>{children}</>
  return (
    <div className="flex items-start gap-content-gap-xs">
      <div className="flex items-center gap-1 shrink-0">
        {typeof exerciseOrdinal === 'number' && <Badge>{String(exerciseOrdinal)}</Badge>}
        {sectionLabel && <Badge>{sectionLabel}</Badge>}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
        'bg-primary/10 border border-primary/20',
        'font-extrabold text-body-sm text-primary',
      )}
    >
      {children}
    </span>
  )
}
