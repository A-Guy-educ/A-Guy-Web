'use client'

import Link from 'next/link'
import { useState } from 'react'

interface QuotaExhaustedCardProps {
  bodyText: string
  upgradeLabel: string
  continueLabel: string
  /** Where the upgrade button navigates. The /products page handles the
   *  actual plan selection + checkout. */
  upgradeHref: string
}

/**
 * One-time card rendered when the student's chat quota runs out (Task 7).
 * Shows the explanatory message + two CTAs:
 *   - Upgrade — navigates to /products so the student can pick a plan.
 *   - Continue in lesson — dismisses the CTAs (the message stays visible as
 *     a stream breadcrumb). After this, Tasks 2/3 AI calls are already
 *     suppressed by useChatChannel's quota flag, so the student just
 *     keeps answering with the canned correct-answer reactions + skip chips.
 *
 * Progress and prior answers are untouched; dismissing is a UX acknowledgment,
 * not a state wipe.
 */
export function QuotaExhaustedCard({
  bodyText,
  upgradeLabel,
  continueLabel,
  upgradeHref,
}: QuotaExhaustedCardProps) {
  const [dismissed, setDismissed] = useState(false)
  return (
    <div className="self-start max-w-[90%] rounded-2xl border-2 border-warning/40 bg-warning/5 p-card-padding shadow-elevation-1">
      <p className="text-body-md text-foreground leading-relaxed">{bodyText}</p>
      {!dismissed && (
        <div className="mt-3 flex flex-wrap items-center gap-content-gap-xs">
          <Link
            href={upgradeHref}
            className="inline-flex items-center rounded-full px-3 py-1 text-body-xs font-semibold border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
          >
            {upgradeLabel}
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="inline-flex items-center rounded-full px-3 py-1 text-body-xs font-semibold border border-border/40 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {continueLabel}
          </button>
        </div>
      )}
    </div>
  )
}
