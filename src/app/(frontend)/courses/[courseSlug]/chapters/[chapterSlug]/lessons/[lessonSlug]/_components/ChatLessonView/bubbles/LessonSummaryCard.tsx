'use client'

import { cn } from '@/infra/utils/ui'
import { Sparkles, Wallet } from 'lucide-react'
import { useState } from 'react'
import type { LessonOutcome, LessonStats } from '../lessonSummary'

interface LessonSummaryCardProps {
  /** Lesson title, rendered under the big outcome headline. */
  lessonTitle: string
  /** Pre-classified outcome bucket — picks the title + assessment copy. */
  outcome: LessonOutcome
  /** Section breakdown. */
  stats: LessonStats
  /** Session duration in whole minutes (floor). */
  elapsedMinutes: number
  /** ILS saved vs. a reference private-lesson price. */
  moneySavedIls: number
  /**
   * Count of sections eligible for Task-5 focused review (wrong / with help /
   * notChecked). When zero, the review button hides.
   */
  reviewableCount: number
  /** i18n copy (owner: the runner — this component stays locale-agnostic). */
  copy: LessonSummaryCopy
  /** "לנסות שוב את N הסעיפים" tapped — walker.startReview wired upstream. */
  onReview: () => void
  /** "השיעור הבא" / "סיום" tapped — walker.completeLesson, or route forward. */
  onFinish: () => void
}

/**
 * i18n strings for the summary card. All assessment-dependent copy is
 * resolved by the runner before render, so this component never reaches
 * into the translations map directly.
 */
export interface LessonSummaryCopy {
  eyebrow: string
  outcomeTitle: string
  sectionsLabel: (count: number) => string
  elapsedLabel: (minutes: number) => string
  moneyLabel: string
  moneyAmount: (ils: number) => string
  moneyNote: string
  moneyAllIncluded: string
  independenceLabel: string
  independencePercent: (percent: number) => string
  independenceNote: (count: number, total: number) => string
  breakdownAlone: string
  breakdownWithHelp: string
  breakdownSkipped: string
  breakdownWrong: string
  assessmentHeading: string
  assessmentBody: string
  reviewCta: (count: number) => string
  finishCta: string
  footerNote: string
}

/**
 * Chat-view end-of-lesson summary. Replaces the plain `lesson-complete`
 * TeacherBubble when the walker reaches its terminator. Independent of the
 * ReviewOfferCard (Task 5) — this card can OWN the review-sections CTA
 * when reviewable sections exist, so the student never sees two separate
 * "wanna redo?" prompts.
 */
export function LessonSummaryCard({
  lessonTitle,
  outcome: _outcome,
  stats,
  elapsedMinutes,
  moneySavedIls,
  reviewableCount,
  copy,
  onReview,
  onFinish,
}: LessonSummaryCardProps) {
  // Local dismiss state so the finish button collapses the card without
  // needing the runner to drop the lesson-complete entry from the stream
  // (which would be fiddly — the walker owns that emission).
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  const handleFinish = () => {
    setDismissed(true)
    onFinish()
  }
  const alonePct =
    stats.totalSections > 0 ? Math.round((stats.alone / stats.totalSections) * 100) : 0
  // Percentages for the horizontal track. Guard against total=0 so an empty
  // lesson doesn't paint NaN widths.
  const widths =
    stats.totalSections > 0
      ? {
          alone: (stats.alone / stats.totalSections) * 100,
          withHelp: (stats.withHelp / stats.totalSections) * 100,
          skipped: (stats.skipped / stats.totalSections) * 100,
          wrong: (stats.wrong / stats.totalSections) * 100,
        }
      : { alone: 0, withHelp: 0, skipped: 0, wrong: 0 }

  return (
    <div
      className={cn(
        'self-stretch rounded-2xl border-2 border-primary/30 bg-background shadow-elevation-1',
        'p-card-padding max-w-xl mx-auto',
      )}
      dir="rtl"
    >
      <p className="text-caption text-muted-foreground">{copy.eyebrow}</p>
      <h2 className="mt-2 text-heading-md font-semibold text-foreground">{copy.outcomeTitle}</h2>
      <p className="mt-1 text-body-md text-foreground">{lessonTitle}</p>
      <p className="mt-1 text-caption text-muted-foreground">
        {copy.sectionsLabel(stats.totalSections)} · {copy.elapsedLabel(elapsedMinutes)}
      </p>

      <section className="mt-5 border-t border-border/60 pt-4">
        <div className="flex items-center gap-content-gap-xs text-body-sm text-foreground">
          <Wallet className="w-4 h-4 text-primary" aria-hidden="true" />
          <span>{copy.moneyLabel}</span>
        </div>
        {moneySavedIls > 0 ? (
          <>
            <p className="mt-2 text-heading-lg font-semibold text-primary">
              {copy.moneyAmount(moneySavedIls)}
            </p>
            <p className="mt-1 text-caption text-muted-foreground">{copy.moneyNote}</p>
          </>
        ) : (
          <p className="mt-2 text-body-md text-foreground">{copy.moneyAllIncluded}</p>
        )}
      </section>

      <section className="mt-5 border-t border-border/60 pt-4">
        <div className="flex items-center gap-content-gap-xs text-body-sm text-foreground">
          <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
          <span>{copy.independenceLabel}</span>
        </div>
        <p className="mt-2 text-heading-lg font-semibold text-primary">
          {copy.independencePercent(alonePct)}
        </p>
        <p className="mt-1 text-caption text-muted-foreground">
          {copy.independenceNote(stats.alone, stats.totalSections)}
        </p>
        <div
          className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${stats.alone}/${stats.withHelp}/${stats.skipped}/${stats.wrong}`}
        >
          <span className="h-full bg-primary" style={{ width: `${widths.alone}%` }} />
          <span className="h-full bg-warning" style={{ width: `${widths.withHelp}%` }} />
          <span className="h-full bg-muted-foreground/40" style={{ width: `${widths.skipped}%` }} />
          <span className="h-full bg-error" style={{ width: `${widths.wrong}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-content-gap-xs text-caption text-muted-foreground">
          <BreakdownCell count={stats.alone} label={copy.breakdownAlone} tone="primary" />
          <BreakdownCell count={stats.withHelp} label={copy.breakdownWithHelp} tone="warning" />
          <BreakdownCell count={stats.skipped} label={copy.breakdownSkipped} tone="muted" />
          <BreakdownCell count={stats.wrong} label={copy.breakdownWrong} tone="error" />
        </div>
      </section>

      <section className="mt-5 border-t border-border/60 pt-4">
        <p className="text-body-sm font-semibold text-foreground">{copy.assessmentHeading}</p>
        <p className="mt-1 text-body-sm text-foreground leading-relaxed">{copy.assessmentBody}</p>
      </section>

      <div className="mt-5 flex flex-col gap-content-gap-xs">
        {reviewableCount > 0 && (
          <button
            type="button"
            onClick={onReview}
            className="w-full rounded-xl bg-primary px-4 py-3 text-body-md font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {copy.reviewCta(reviewableCount)}
          </button>
        )}
        <button
          type="button"
          onClick={handleFinish}
          className={cn(
            'w-full rounded-xl border px-4 py-3 text-body-md font-semibold transition-colors',
            reviewableCount > 0
              ? 'border-border/60 bg-background text-foreground hover:bg-muted'
              : 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10',
          )}
        >
          {copy.finishCta}
        </button>
      </div>

      <p className="mt-4 text-center text-caption text-muted-foreground">{copy.footerNote}</p>
    </div>
  )
}

interface BreakdownCellProps {
  count: number
  label: string
  tone: 'primary' | 'warning' | 'muted' | 'error'
}

function BreakdownCell({ count, label, tone }: BreakdownCellProps) {
  return (
    <div className="flex items-baseline gap-content-gap-xs">
      <span
        className={cn(
          'text-body-md font-semibold',
          tone === 'primary' && 'text-primary',
          tone === 'warning' && 'text-warning',
          tone === 'muted' && 'text-muted-foreground',
          tone === 'error' && 'text-error',
        )}
      >
        {count}
      </span>
      <span className="text-caption text-muted-foreground">{label}</span>
    </div>
  )
}
