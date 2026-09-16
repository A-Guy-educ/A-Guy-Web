'use client'

import React from 'react'
import { cn } from '@/infra/utils/ui'
import type { GraphLayout } from '@/infra/types/exercise'

interface QuestionWithAttachmentProps {
  layout: GraphLayout
  question: React.ReactNode
  attachment: React.ReactNode
}

/**
 * Side-by-side / stacked wrapper for a question block and its optional
 * sketch attachment. Question side hosts the full QuestionCard (help
 * system, check button, batch modes); attachment side renders SVG /
 * geometry / axis via the existing standalone renderers.
 *
 * Side-by-side layouts force `dir="ltr"` on the flex container so the
 * physical position matches the semantic value regardless of page
 * direction (RTL Hebrew). Inner content still inherits its own
 * direction via `dir="auto"`.
 */
export function QuestionWithAttachment({
  layout,
  question,
  attachment,
}: QuestionWithAttachmentProps) {
  const isSideBySide = layout === 'textLeft' || layout === 'textRight'
  const showAttachmentFirst = layout === 'textBelow' || layout === 'textRight'

  const containerClasses = isSideBySide ? 'flex flex-col sm:flex-row' : 'flex flex-col'
  const questionSlot = cn('min-w-0', isSideBySide && 'flex-1')
  const attachmentSlot = cn(
    isSideBySide ? 'flex-1 min-w-0 max-w-full self-start' : 'w-full',
    // Mobile stacking: `textRight` places the attachment first in DOM so
    // on desktop the attachment sits on the left of an LTR flex-row
    // (giving the visual right-side prompt). On mobile (flex-col) that
    // would push the attachment above the prompt — flip DOM order back
    // on mobile so the student sees the question first.
    isSideBySide && layout === 'textRight' && 'order-last sm:order-none',
  )

  return (
    <div className={cn('gap-content-gap', containerClasses)} dir={isSideBySide ? 'ltr' : undefined}>
      {showAttachmentFirst ? (
        <>
          <div className={attachmentSlot}>{attachment}</div>
          <div className={questionSlot} dir="auto">
            {question}
          </div>
        </>
      ) : (
        <>
          <div className={questionSlot} dir="auto">
            {question}
          </div>
          <div className={attachmentSlot}>{attachment}</div>
        </>
      )}
    </div>
  )
}
