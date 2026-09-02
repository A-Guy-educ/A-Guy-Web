'use client'

import { cn } from '@/infra/utils/ui'
import { RotateCcw } from 'lucide-react'

interface ChatLessonProgressProps {
  stepIndex: number
  totalSteps: number
  currentExerciseOrdinal: number
  totalExercises: number
  currentSectionOrdinal: number
  currentExerciseSections: number
  exerciseLabel: string
  sectionLabel: string
  onReset: () => void
}

/**
 * Floating top-row chrome for the chat-view mode. Two absolutely-placed
 * pieces inside the primary content container (which is `relative`):
 *
 *  - Small progress pill on the RTL-end edge (LEFT visually in Hebrew) —
 *    opposite the workspace's `LessonMenu`, which sits at RTL-start.
 *  - Plain reset button at `start-14`, sitting NEXT TO the LessonMenu
 *    (LessonMenu is fixed at `start-3`; button is `w-8` + gap → ~40px
 *    of clearance, so start-14 lands right beside it).
 *
 * Mute lives inside LessonMenu itself (wired via `LessonMenuProvider`)
 * so this component doesn't need TTS props at all.
 *
 * The middle zone is intentionally empty — the given-data pill
 * (`GivenDataFloating`) occupies it as a separate absolutely-positioned
 * component.
 */
export function ChatLessonProgress({
  stepIndex,
  totalSteps,
  currentExerciseOrdinal,
  totalExercises,
  currentSectionOrdinal,
  currentExerciseSections,
  exerciseLabel,
  sectionLabel,
  onReset,
}: ChatLessonProgressProps) {
  const clampedIndex = Math.max(0, Math.min(stepIndex, totalSteps - 1))
  const percent = totalSteps > 0 ? Math.round(((clampedIndex + 1) / totalSteps) * 100) : 0
  const stepDisplay = totalSteps > 0 ? `${clampedIndex + 1}/${totalSteps}` : ''

  const showExerciseText = totalExercises > 1 && currentExerciseOrdinal > 0
  const showSectionText = currentExerciseSections > 1 && currentSectionOrdinal > 0

  return (
    <div dir="rtl" className="print:hidden">
      {/* Progress pill — RTL end (left visually), opposite the LessonMenu */}
      <div
        className={cn(
          'absolute top-3 end-3 z-30 pointer-events-auto',
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full',
          'bg-card/95 backdrop-blur-md border border-border shadow-elevation-1',
        )}
      >
        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-[width] duration-slow"
            style={{ width: `${percent}%` }}
          />
        </div>
        {stepDisplay && (
          <span className="text-body-2xs font-bold text-primary tabular-nums whitespace-nowrap">
            {stepDisplay}
          </span>
        )}
        {(showExerciseText || showSectionText) && (
          <span className="hidden sm:inline text-body-2xs font-semibold text-muted-foreground tabular-nums whitespace-nowrap">
            {showExerciseText && `${exerciseLabel} ${currentExerciseOrdinal}/${totalExercises}`}
            {showExerciseText && showSectionText && ' · '}
            {showSectionText &&
              `${sectionLabel} ${currentSectionOrdinal}/${currentExerciseSections}`}
          </span>
        )}
      </div>

      {/* Reset — RTL start (right visually), offset from the edge so it sits
          next to the workspace's LessonMenu (fixed at `start-3`). */}
      <button
        type="button"
        onClick={onReset}
        aria-label="התחל מחדש"
        className={cn(
          'absolute top-3 start-14 z-30 pointer-events-auto',
          'w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90',
          'bg-card/95 backdrop-blur-md border border-border shadow-elevation-1',
          'text-muted-foreground hover:text-foreground',
        )}
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  )
}
