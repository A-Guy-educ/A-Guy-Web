'use client'

import { AskDrawingCanvas } from '@/app/(frontend)/ask/_components/AskDrawingCanvas'
import { isRTL } from '@/i18n/config'
import { cn } from '@/infra/utils/ui'
import { useLocale, useTranslations } from '@/ui/web/providers/I18n'
import { AnimatePresence, motion } from 'framer-motion'
import { NotebookPen, X } from 'lucide-react'
import { useCallback, useState } from 'react'

/**
 * Event name `ChatInterface` (interactive view) and `ChatLessonRunnerView`
 * (chat view) both listen for. When `type === 'check'` and `imageData` is a
 * PNG data URL, the chat uploads the drawing and asks the tutor to compare
 * it against the current exercise. Contract lives in
 * `src/app/(frontend)/ask/_components/ask-types.ts` — repeated here as a
 * literal so we don't import an app-route constant into a shared UI module.
 */
const ASK_ACTION_EVENT = 'ask-action'

interface NotebookProps {
  /**
   * Label the chat prompt uses to refer to the current exercise (e.g. the
   * exercise or lesson title). Falls back to the drawer's own title.
   */
  contextTitle?: string
  /**
   * Media id of the exercise image, forwarded so the chat can send both the
   * student's drawing AND the original question image to the tutor. Leave
   * undefined for exercises that don't have a single background image.
   */
  mediaId?: string
  /**
   * Optional class merged into the floating action button. Callers whose
   * layout has a competing pinned element (chat input, mobile bottom nav)
   * can nudge the button up/left/right without touching this component.
   */
  fabClassName?: string
}

/**
 * Lesson-view wrapper around the Ask-page drawing notebook.
 *
 * The heavy lifting — pen palette, clear, "Check solution" button, canvas
 * pointer handling — lives in `AskDrawingCanvas`, imported verbatim so the
 * two flows can't drift apart. This component adds:
 *   - a floating action button + slide-out drawer so the notebook attaches
 *     to layouts that don't have their own sidebar,
 *   - a bridge that turns the drawing into an `ask-action` `CustomEvent`
 *     when the student clicks Check — the same event the chat listeners
 *     already handle.
 */
export function Notebook({ contextTitle, mediaId, fabClassName }: NotebookProps) {
  const t = useTranslations('notebook')
  const locale = useLocale()
  const rtl = isRTL(locale as 'en' | 'he')
  const [open, setOpen] = useState(false)

  const handleCheckSolution = useCallback(
    (imageData: string) => {
      window.dispatchEvent(
        new CustomEvent(ASK_ACTION_EVENT, {
          detail: {
            type: 'check',
            title: contextTitle ?? t('title'),
            imageData,
            mediaId,
          },
        }),
      )
      setOpen(false)
    },
    [contextTitle, mediaId, t],
  )

  const enterOffset = rtl ? '-100%' : '100%'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('open')}
        title={t('title')}
        className={cn(
          'fixed bottom-20 end-4 z-[300] h-12 w-12 rounded-full',
          'bg-primary text-primary-foreground shadow-elevation-3',
          'flex items-center justify-center hover:bg-primary/90 transition-colors',
          fabClassName,
        )}
      >
        <NotebookPen className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[350] bg-black/30"
            />
            <motion.aside
              initial={{ x: enterOffset }}
              animate={{ x: 0 }}
              exit={{ x: enterOffset }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 end-0 z-[360] w-full max-w-md bg-card border-s border-border shadow-elevation-4 flex flex-col overflow-y-auto"
            >
              <header className="flex items-center justify-between p-3 border-b border-border">
                <h2 className="text-body-md font-semibold text-foreground">{t('title')}</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('close')}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </header>

              <div className="flex-1 min-h-0 px-3 pb-3">
                <AskDrawingCanvas onCheckSolution={handleCheckSolution} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
