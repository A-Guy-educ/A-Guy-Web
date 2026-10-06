'use client'

import { cn } from '@/infra/utils/ui'

interface ChatLessonProgressProps {
  stepIndex: number
  totalSteps: number
  currentExerciseOrdinal: number
  totalExercises: number
  currentSectionOrdinal: number
  currentExerciseSections: number
  exerciseLabel: string
  sectionLabel: string
}

/**
 * Floating top-row progress pill for the chat-view mode. Rendered on the
 * RTL-end edge (LEFT visually in Hebrew), opposite the workspace's
 * `LessonMenu` which sits at RTL-start and owns the back + menu buttons
 * + lesson-title plaque.
 *
 * Mute + restart live inside LessonMenu itself (wired via
 * `LessonMenuProvider`), so this component only owns the progress pill.
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

    </div>
  )
}
