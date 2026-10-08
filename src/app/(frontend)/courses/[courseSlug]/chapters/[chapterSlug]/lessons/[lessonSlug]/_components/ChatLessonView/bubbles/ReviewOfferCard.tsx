'use client'

import { useState } from 'react'

interface ReviewOfferCardProps {
  bodyText: string
  yesLabel: string
  endLabel: string
  onYes: () => void
  onEnd: () => void
}

/**
 * Task-5 end-of-lesson review card. Emitted by the walker in place of the
 * lesson-complete terminator when the student answered any section wrong,
 * used a hint, or had AI validation skipped. The two CTAs mutate the
 * walker:
 *   - "כן, ננסה שוב" → walker.startReview(): enters review mode and
 *     re-emits the eligible sections with a storageIdOverride so the
 *     student's second attempt doesn't stomp on the original pass.
 *   - "סיום" → walker.completeLesson(): fires the terminator immediately.
 *
 * Both buttons collapse once one is tapped — the explanatory text stays as
 * a scrollback breadcrumb so the student remembers what they chose.
 */
export function ReviewOfferCard({
  bodyText,
  yesLabel,
  endLabel,
  onYes,
  onEnd,
}: ReviewOfferCardProps) {
  const [choice, setChoice] = useState<'yes' | 'end' | null>(null)
  const handleYes = () => {
    if (choice) return
    setChoice('yes')
    onYes()
  }
  const handleEnd = () => {
    if (choice) return
    setChoice('end')
    onEnd()
  }
  return (
    <div className="self-start max-w-[90%] rounded-2xl border-2 border-primary/30 bg-primary/5 p-card-padding shadow-elevation-1">
      <p className="text-body-md text-foreground leading-relaxed">{bodyText}</p>
      {!choice && (
        <div className="mt-3 flex flex-wrap items-center gap-content-gap-xs">
          <button
            type="button"
            onClick={handleYes}
            className="inline-flex items-center rounded-full px-3 py-1 text-body-xs font-semibold border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
          >
            {yesLabel}
          </button>
          <button
            type="button"
            onClick={handleEnd}
            className="inline-flex items-center rounded-full px-3 py-1 text-body-xs font-semibold border border-border/40 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {endLabel}
          </button>
        </div>
      )}
    </div>
  )
}
