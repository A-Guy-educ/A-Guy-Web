'use client'

import { cn } from '@/infra/utils/ui'
import { RotateCcw, Volume2, VolumeX } from 'lucide-react'

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
  onToggleMute?: () => void
  muted?: boolean
  ttsSupported?: boolean
}

/**
 * Floating progress + controls row for the chat-view mode. Positioned as
 * an absolutely-placed pill at the top of the parent (the primary content
 * container in ChatLessonView is `relative` so this anchors correctly).
 * Sits alongside the workspace's LessonMenu without conflicting.
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
  onToggleMute,
  muted,
  ttsSupported,
}: ChatLessonProgressProps) {
  const clampedIndex = Math.max(0, Math.min(stepIndex, totalSteps - 1))
  const percent = totalSteps > 0 ? Math.round(((clampedIndex + 1) / totalSteps) * 100) : 0

  // Only show the exercise/section text when there's actually a range to show
  // — a single-exercise or single-section lesson doesn't benefit from an
  // "Exercise 1/1" chip and it just adds noise.
  const showExerciseText = totalExercises > 1 && currentExerciseOrdinal > 0
  const showSectionText = currentExerciseSections > 1 && currentSectionOrdinal > 0

  return (
    <div
      className="absolute top-3 inset-x-0 z-30 flex items-center justify-center gap-content-gap-xs px-3 pointer-events-none print:hidden"
      dir="rtl"
    >
      {/* Progress pill */}
      <div
        className={cn(
          'pointer-events-auto flex items-center gap-content-gap-xs px-3 py-1.5 rounded-full',
          'bg-card/95 backdrop-blur-md border border-border shadow-elevation-1',
        )}
      >
        <div className="w-16 sm:w-24 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-[width] duration-slow"
            style={{ width: `${percent}%` }}
          />
        </div>
        {(showExerciseText || showSectionText) && (
          <span className="hidden sm:inline text-body-xs font-semibold text-muted-foreground tabular-nums whitespace-nowrap">
            {showExerciseText && `${exerciseLabel} ${currentExerciseOrdinal}/${totalExercises}`}
            {showExerciseText && showSectionText && ' · '}
            {showSectionText &&
              `${sectionLabel} ${currentSectionOrdinal}/${currentExerciseSections}`}
          </span>
        )}
        <span className="text-body-xs font-bold text-primary tabular-nums whitespace-nowrap">
          {percent}%
        </span>
      </div>

      {/* Action controls */}
      <div className="pointer-events-auto flex items-center gap-1.5">
        {ttsSupported && onToggleMute && (
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'הפעל קול' : 'השתק קול'}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90',
              'bg-card/95 backdrop-blur-md border border-border shadow-elevation-1',
              muted ? 'text-muted-foreground' : 'text-primary hover:bg-primary/10',
            )}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          aria-label="התחל מחדש"
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90',
            'bg-card/95 backdrop-blur-md border border-border shadow-elevation-1',
            'text-muted-foreground hover:text-foreground',
          )}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
