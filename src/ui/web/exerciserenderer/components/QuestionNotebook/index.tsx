'use client'

import { AskDrawingCanvas } from '@/app/(frontend)/ask/_components/AskDrawingCanvas'
import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import { AnimatePresence, motion } from 'framer-motion'
import { NotebookPen } from 'lucide-react'
import { useCallback, useState } from 'react'

/**
 * `ChatInterface` (interactive view) and `ChatLessonRunnerView` (chat view)
 * both listen for this event on `window`. When `type === 'check'` with a
 * PNG data URL in `detail.imageData`, the chat uploads the drawing and
 * asks the tutor to compare it against the current exercise. Contract
 * lives in `src/app/(frontend)/ask/_components/ask-types.ts` — repeated
 * as a literal so we don't import an app-route constant into shared UI.
 */
const ASK_ACTION_EVENT = 'ask-action'

interface QuestionNotebookProps {
  /** Label the tutor prompt uses to identify which block was submitted. */
  contextTitle: string
}

/**
 * Per-question drawing notebook — mounted at the bottom of each
 * `QuestionCard` (MCQ, true/false, free-response, table, matching, and
 * interactive SVG). Toggle button expands `AskDrawingCanvas` inline under
 * the check-answer row, mirroring the Ask page's `AskExerciseCard`
 * pattern so the two flows share the same drawing UX and the same
 * `ask-action` dispatch. No more floating FAB — each block has its own.
 */
export function QuestionNotebook({ contextTitle }: QuestionNotebookProps) {
  const t = useTranslations('notebook')
  const [open, setOpen] = useState(false)

  const handleCheckSolution = useCallback(
    (imageData: string) => {
      window.dispatchEvent(
        new CustomEvent(ASK_ACTION_EVENT, {
          detail: {
            type: 'check',
            title: contextTitle,
            imageData,
          },
        }),
      )
    },
    [contextTitle],
  )

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? t('close') : t('open')}
        className={cn(
          'inline-flex items-center gap-content-gap-xs px-3 py-1.5 rounded-full',
          'text-body-xs font-semibold transition-colors',
          open
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-primary/10 text-primary hover:bg-primary/20',
        )}
      >
        <NotebookPen className="w-3.5 h-3.5" />
        {open ? t('close') : t('open')}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <AskDrawingCanvas onCheckSolution={handleCheckSolution} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
