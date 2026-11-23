/**
 * Help System
 *
 * Composes HelpSystemButtons + HelpSystemContent for a single question.
 * Renders below the question content, before the check button.
 */

'use client'

import React from 'react'
import { AnimatePresence } from 'framer-motion'
import type { HelpUsageState, QuestionBlock } from '../../types'
import { HelpSystemButtons } from './HelpSystemButtons'
import { HelpSystemContent } from './HelpSystemContent'

interface HelpSystemProps {
  question: QuestionBlock
  helpUsage: HelpUsageState
  activeHelp: 'hint' | 'guiding' | 'solution' | null
  onHintClick: () => void
  onGuidingClick: () => void
  onSolutionClick: () => void
  hintLabel: string
  guidingLabel: string
  solutionLabel: string
  /** Also show the guiding question and the explanation inline (no lesson chat). */
  inlineAll?: boolean
}

function writtenContent(
  question: QuestionBlock,
  type: 'hint' | 'guiding' | 'solution' | null,
  inlineAll: boolean,
): string | null {
  const q = question as QuestionBlock & {
    hint?: { value?: string }
    solution?: { value?: string }
    fullSolution?: { value?: string }
  }
  if (type === 'hint') return q.hint?.value || null
  if (!inlineAll) return null
  if (type === 'guiding') return q.solution?.value || null
  if (type === 'solution') return q.fullSolution?.value || null
  return null
}

export function HelpSystem({
  question,
  helpUsage,
  activeHelp,
  onHintClick,
  onGuidingClick,
  onSolutionClick,
  hintLabel,
  guidingLabel,
  solutionLabel,
  inlineAll = false,
}: HelpSystemProps) {
  // Inline content: the hint when it's written; with `inlineAll`, the guiding
  // question and explanation too (otherwise those go to the lesson chat).
  const inlineContent = writtenContent(question, activeHelp, inlineAll)

  return (
    <div className="mt-4 border-t border-border pt-3">
      <HelpSystemButtons
        helpUsage={helpUsage}
        activeHelp={activeHelp}
        onHintClick={onHintClick}
        onGuidingClick={onGuidingClick}
        onSolutionClick={onSolutionClick}
        hintLabel={hintLabel}
        guidingLabel={guidingLabel}
        solutionLabel={solutionLabel}
      />

      <AnimatePresence>
        {inlineContent && (
          <div className="mt-3">
            <HelpSystemContent
              key={activeHelp}
              type={activeHelp ?? 'hint'}
              content={inlineContent}
              hintLabel={hintLabel}
              guidingLabel={guidingLabel}
              solutionLabel={solutionLabel}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
