'use client'

import { cn } from '@/infra/utils/ui'
import { HelpCircle, Lightbulb, SkipForward } from 'lucide-react'

export type QuickAction = 'hint' | 'explain' | 'skip' | 'skipExercise'

interface QuickActionChipsProps {
  disabled?: boolean
  hintLabel: string
  explainLabel: string
  skipLabel: string
  skipExerciseLabel: string
  onAction: (action: QuickAction) => void
}

/**
 * Small pill-shaped buttons rendered under a question in the chat-native
 * path. They dispatch canned prompts the runner routes through the existing
 * chat channel (hint / explain use `requestCorrection`'s invisible-user
 * variant so the transcript only shows the AI reply; skip + skipExercise
 * just advance the walker without a chat roundtrip). Discovery affordance
 * for students who wouldn't otherwise notice the freeform chat input at the
 * bottom.
 *
 * Visual hierarchy: hint/explain are the primary CTAs (filled-primary),
 * skip-section is deemphasized (ghost), and skip-exercise is the smallest
 * + most muted (ghostlink) so it doesn't invite accidental taps — the spec
 * explicitly asks for it to be less prominent than the sibling skip chip.
 */
export function QuickActionChips({
  disabled,
  hintLabel,
  explainLabel,
  skipLabel,
  skipExerciseLabel,
  onAction,
}: QuickActionChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-content-gap-xs mt-2">
      <Chip
        icon={<Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />}
        label={hintLabel}
        disabled={disabled}
        onClick={() => onAction('hint')}
      />
      <Chip
        icon={<HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />}
        label={explainLabel}
        disabled={disabled}
        onClick={() => onAction('explain')}
      />
      <Chip
        icon={<SkipForward className="w-3.5 h-3.5" aria-hidden="true" />}
        label={skipLabel}
        disabled={disabled}
        onClick={() => onAction('skip')}
        variant="ghost"
      />
      <Chip
        label={skipExerciseLabel}
        disabled={disabled}
        onClick={() => onAction('skipExercise')}
        variant="ghostlink"
      />
    </div>
  )
}

interface ChipProps {
  icon?: React.ReactNode
  label: string
  disabled?: boolean
  onClick: () => void
  variant?: 'default' | 'ghost' | 'ghostlink'
}

function Chip({ icon, label, disabled, onClick, variant = 'default' }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant !== 'ghostlink' &&
          'gap-1.5 rounded-full px-3 py-1 text-body-xs font-semibold border',
        variant === 'default' &&
          !disabled &&
          'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50',
        variant === 'ghost' &&
          !disabled &&
          'border-border/40 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
        variant === 'ghostlink' &&
          'rounded-none px-1 text-caption text-muted-foreground/70 underline-offset-2 hover:text-muted-foreground hover:underline',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
