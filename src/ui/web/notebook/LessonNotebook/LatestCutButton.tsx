'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Shapes, X } from 'lucide-react'
import { useState } from 'react'

import { useMediaQuery } from '@/client/hooks/useMediaQuery'
import type { NotebookCut, NotebookPage } from '@/infra/types/notebook'
import { useTranslations } from '@/ui/web/providers/I18n'

/** The cut on the most recently created page that has one. */
export function latestCutOf(pages: readonly NotebookPage[]): NotebookCut | null {
  const newest = pages.reduce<NotebookPage | null>(
    (best, page) =>
      page.cut && (!best || Date.parse(page.createdAt) >= Date.parse(best.createdAt)) ? page : best,
    null,
  )
  return newest?.cut ?? null
}

/**
 * Yellow toolbar button that shows the newest cut in a card under the toolbar,
 * so a student who has scrolled down to write can still read the exercise.
 * Same colour and icon as the chat view's given-data pill. Tablet and desktop
 * only.
 *
 * Rendered inside the toolbar, which is sticky and so positions the card.
 */
export function LatestCutButton({ cut }: { cut: NotebookCut | null }) {
  const t = useTranslations('courses.lessonNotebook')
  const isTabletUp = useMediaQuery('(min-width: 768px)')
  const [open, setOpen] = useState(false)

  if (!cut || !isTabletUp) return null

  const source = cut.source.page
    ? t('sourceWithPage')
        .replace('{label}', cut.source.label)
        .replace('{page}', String(cut.source.page))
    : cut.source.label

  return (
    <>
      <button
        type="button"
        aria-label={t('showLatestCut')}
        title={t('showLatestCut')}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-warning text-warning-foreground shadow-elevation-1 active:scale-95 transition-all"
      >
        <Shapes className="h-4 w-4" />
      </button>
      <div className="mx-1 h-5 w-px bg-border" />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute top-full start-0 mt-2 w-[78%] overflow-hidden rounded-2xl border border-warning/40 bg-card shadow-card-hover"
          >
            <header className="flex items-center justify-between gap-content-gap-xs bg-warning/15 px-3 py-1.5 text-body-xs font-bold text-foreground">
              <span>{t('latestCutTitle')}</span>
              <button
                type="button"
                aria-label={t('hideLatestCut')}
                title={t('hideLatestCut')}
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-normal"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </header>
            <div className="p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob-hosted user cut, sized by the card */}
              <img
                src={cut.url}
                alt={t('cutAlt')}
                width={cut.width}
                height={cut.height}
                className="block h-auto max-h-[45vh] w-full rounded-lg object-contain"
              />
              <p className="mt-1.5 truncate text-body-xs text-muted-foreground">{source}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
