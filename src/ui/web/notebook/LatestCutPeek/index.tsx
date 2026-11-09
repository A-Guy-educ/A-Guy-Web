'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Scissors } from 'lucide-react'
import { useState } from 'react'

import { useMediaQuery } from '@/client/hooks/useMediaQuery'
import { useTranslations } from '@/ui/web/providers/I18n'
import { useLatestCut } from './latest-cut-store'

/**
 * Amber pill over the chat that shows the newest notebook cut, so a student
 * can read the exercise while talking to the tutor. Matches the chat view's
 * given-data pill. The image is sized by the panel, so it follows the chat
 * when the student drags the divider. Tablet and desktop only.
 *
 * Rendered inside the chat's root element, which is `relative`.
 */
export function LatestCutPeek() {
  const t = useTranslations('courses.lessonNotebook')
  const cut = useLatestCut()
  const isTabletUp = useMediaQuery('(min-width: 768px)')
  const [open, setOpen] = useState(false)

  if (!cut || !isTabletUp) return null

  return (
    <div className="absolute top-3 inset-x-0 z-30 flex justify-center pointer-events-none">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning text-warning-foreground border border-warning shadow-elevation-1 text-body-xs font-bold active:scale-95 transition-all"
      >
        <Scissors className="w-3.5 h-3.5" />
        <span>{open ? t('hideLatestCut') : t('showLatestCut')}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute top-11 inset-x-3 pointer-events-auto rounded-2xl border border-warning/40 bg-card p-2 shadow-card-hover"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- blob-hosted user cut, sized by the chat panel */}
            <img
              src={cut.url}
              alt={t('cutAlt')}
              width={cut.width}
              height={cut.height}
              className="block h-auto max-h-[45vh] w-full rounded-lg object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
