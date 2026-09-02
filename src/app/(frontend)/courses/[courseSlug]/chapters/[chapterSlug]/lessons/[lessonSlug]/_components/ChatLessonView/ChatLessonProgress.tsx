'use client'

import { cn } from '@/infra/utils/ui'
import { AnimatePresence, motion } from 'framer-motion'
import { MoreVertical, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

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
 * Floating top-row chrome for the chat-view mode. Renders two absolutely-
 * placed elements inside the primary content container (which is `relative`):
 *  - Small progress pill on the RTL-start edge (right visually in Hebrew).
 *  - "More" menu button on the RTL-end edge (left visually) with mute +
 *    reset actions inside the dropdown.
 *
 * The middle zone is intentionally empty here — the given-data pill
 * (`GivenDataFloating`) occupies it as a separate absolutely-positioned
 * component so the two never fight over layout.
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
  const stepDisplay = totalSteps > 0 ? `${clampedIndex + 1}/${totalSteps}` : ''

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  // Only show verbose exercise/section text on wider viewports — the small
  // pill in the mockup keeps to just the bar + step count on mobile.
  const showExerciseText = totalExercises > 1 && currentExerciseOrdinal > 0
  const showSectionText = currentExerciseSections > 1 && currentSectionOrdinal > 0

  return (
    <div dir="rtl" className="print:hidden">
      {/* Progress pill — RTL start (right visually) */}
      <div
        className={cn(
          'absolute top-3 start-3 z-30 pointer-events-auto',
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

      {/* More menu — RTL end (left visually). Contains mute + reset. */}
      <div ref={menuRef} className="absolute top-3 end-3 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="פעולות"
          aria-expanded={menuOpen}
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90',
            'bg-card/95 backdrop-blur-md border border-border shadow-elevation-1',
            'text-muted-foreground hover:text-foreground',
          )}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.16 }}
              role="menu"
              className={cn(
                'absolute top-11 end-0 w-48 z-50 p-1.5 space-y-0.5',
                'bg-card/98 backdrop-blur-md border border-border shadow-card-hover rounded-2xl',
              )}
            >
              {ttsSupported && onToggleMute && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onToggleMute()
                    setMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-content-gap-xs px-2.5 py-2 hover:bg-muted active:bg-muted/70 rounded-xl text-start transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </span>
                  <span className="font-medium text-body-sm text-foreground">
                    {muted ? 'הפעל קול' : 'השתק קול'}
                  </span>
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  onReset()
                }}
                className="w-full flex items-center gap-content-gap-xs px-2.5 py-2 hover:bg-muted active:bg-muted/70 rounded-xl text-start transition-colors"
              >
                <span className="w-7 h-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </span>
                <span className="font-medium text-body-sm text-foreground">התחל מחדש</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
