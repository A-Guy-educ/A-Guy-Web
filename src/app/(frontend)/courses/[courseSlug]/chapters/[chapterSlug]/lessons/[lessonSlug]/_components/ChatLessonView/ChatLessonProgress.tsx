'use client'

import { cn } from '@/infra/utils/ui'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

interface ChatLessonProgressProps {
  /**
   * Walker step cursor — any change signals a section was just completed
   * and the display should swap back to the progress mode immediately.
   */
  stepIndex: number
  /** 1-based exercise ordinal of the current step. */
  currentExerciseOrdinal: number
  /** Total exercises in the lesson. Progress bar reads out of this. */
  totalExercises: number
  /** Lesson title — shown during the "name" half of the cycle. */
  lessonTitle: string
  /**
   * Translated label for progress mode's screen reader announcement
   * (e.g. "Exercise"). The visible text is `ordinal / total`.
   */
  exerciseLabel: string
}

/**
 * Floating top-row pill for the chat view. Cycles between two modes at a
 * fixed position + fixed size with a soft crossfade:
 *
 *   - **name**: the lesson title (3 s)
 *   - **progress**: a bar + `ordinal / total` exercise counter (8 s)
 *
 * Lifecycle:
 *   - On mount: start in `name` for 3 s, then enter the cycle.
 *   - Steady state: `progress` for 8 s → `name` for 3 s, repeat.
 *   - Section completed (`stepIndex` advances): snap back to `progress`
 *     immediately and restart the cycle timer so the student sees the
 *     updated bar as feedback.
 *   - Click: show `name` for 3 s, then resume the cycle.
 *
 * Boss's spec (translated from Hebrew): the swap happens at the same
 * position and the pill holds a fixed size so content doesn't shift as
 * the two layers crossfade.
 */
const NAME_MS = 3000
const PROGRESS_MS = 8000

export function ChatLessonProgress({
  stepIndex,
  currentExerciseOrdinal,
  totalExercises,
  lessonTitle,
  exerciseLabel,
}: ChatLessonProgressProps) {
  const [mode, setMode] = useState<'name' | 'progress'>('name')
  // Bump this to re-trigger the autoswap timer (new section advance, or click).
  const [cycleTick, setCycleTick] = useState(0)
  const prevStepRef = useRef<number | null>(null)

  // Section advance → immediate progress mode + fresh cycle timer. First
  // mount is excluded (the component should start in `name`), tracked via
  // the ref initialised to null.
  useEffect(() => {
    if (prevStepRef.current !== null && stepIndex !== prevStepRef.current) {
      setMode('progress')
      setCycleTick((n) => n + 1)
    }
    prevStepRef.current = stepIndex
  }, [stepIndex])

  // Autoswap after the mode's dwell time.
  useEffect(() => {
    const duration = mode === 'name' ? NAME_MS : PROGRESS_MS
    const timer = setTimeout(() => {
      setMode((current) => (current === 'name' ? 'progress' : 'name'))
    }, duration)
    return () => clearTimeout(timer)
  }, [mode, cycleTick])

  const handleClick = () => {
    setMode('name')
    setCycleTick((n) => n + 1)
  }

  const percent =
    totalExercises > 0
      ? Math.round((Math.min(currentExerciseOrdinal, totalExercises) / totalExercises) * 100)
      : 0
  const counterText = totalExercises > 0 ? `${currentExerciseOrdinal}/${totalExercises}` : ''
  const srLabel = mode === 'name' ? lessonTitle : `${exerciseLabel} ${counterText}`.trim()

  return (
    <div dir="rtl" className="print:hidden">
      <button
        type="button"
        onClick={handleClick}
        aria-label={srLabel}
        className={cn(
          'absolute top-3 end-3 z-30 pointer-events-auto',
          // Fixed footprint so crossfading content doesn't nudge siblings.
          'h-8 w-44 sm:w-56 rounded-full overflow-hidden',
          'bg-card/95 backdrop-blur-md border border-border shadow-elevation-1',
          'text-start cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <AnimatePresence initial={false}>
          {mode === 'name' ? (
            <motion.div
              key="name"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 flex items-center justify-center px-3"
            >
              <span className="text-body-xs font-bold text-foreground truncate">{lessonTitle}</span>
            </motion.div>
          ) : (
            <motion.div
              key="progress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 flex items-center gap-content-gap-xs px-3"
            >
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-[width] duration-slow"
                  style={{ width: `${percent}%` }}
                />
              </div>
              {counterText && (
                <span className="text-body-2xs font-bold text-primary tabular-nums whitespace-nowrap">
                  {counterText}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  )
}
