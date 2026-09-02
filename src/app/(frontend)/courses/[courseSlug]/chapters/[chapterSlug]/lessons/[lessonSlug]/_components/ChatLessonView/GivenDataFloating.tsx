'use client'

import type { Media } from '@/infra/types/content'
import type { RichTextBlock } from '@/infra/types/exercise'
import { cn } from '@/infra/utils/ui'
import { RichTextRenderer } from '@/ui/web/exerciserenderer/blocks/RichTextRenderer'
import { MediaMapProvider } from '@/ui/web/exerciserenderer/context/MediaMapContext'
import { AnimatePresence, motion } from 'framer-motion'
import { Shapes, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const EMPTY_MEDIA_MAP: Record<string, Media> = {}

interface GivenDataFloatingProps {
  /** Rich-text blocks from the current EXERCISE (all sections). Treated as
   *  the exercise's "given data" (statement, figures, formulas). Stays
   *  stable while the student walks through sections A-D of the same
   *  exercise and only changes when they advance to the next exercise. */
  richTextBlocks: RichTextBlock[]
  mediaMap?: Record<string, Media>
  /** Identity key for the current exercise. Toggling this collapses the
   *  dropdown so a stale given-data card never overlays a new exercise. */
  exerciseKey?: string
  showLabel: string
  hideLabel: string
  title: string
  /** Copy shown inside the dropdown when the current exercise has no
   *  rich_text blocks (e.g. algebra-only exercises whose statement is
   *  a bare LaTeX line). Optional — omit to render nothing in that case. */
  emptyLabel?: string
}

/**
 * Floating amber pill at top-center that toggles a dropdown showing the
 * current exercise's given data. Always visible while an exercise is
 * active so students can re-check the statement + figures at any time.
 *
 * Rendered inside the chat-view primary container (which is `relative`).
 */
export function GivenDataFloating({
  richTextBlocks,
  mediaMap,
  exerciseKey,
  showLabel,
  hideLabel,
  title,
  emptyLabel,
}: GivenDataFloatingProps) {
  const [open, setOpen] = useState(false)

  // Collapse whenever the student advances to a new exercise so a stale
  // given-data card never overlays a different exercise's chrome.
  useEffect(() => {
    setOpen(false)
  }, [exerciseKey])

  const hasContent = richTextBlocks.length > 0

  return (
    <div
      className="absolute top-3 inset-x-0 z-30 flex justify-center pointer-events-none"
      dir="rtl"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full',
          'bg-warning text-warning-foreground border border-warning shadow-elevation-1',
          'text-body-xs font-bold active:scale-95 transition-all',
        )}
      >
        <Shapes className="w-3.5 h-3.5" />
        <span>{open ? hideLabel : showLabel}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="given-data-modal"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute top-11 inset-x-3 max-w-2xl mx-auto pointer-events-auto"
            role="dialog"
            aria-label={title}
          >
            <div className="rounded-2xl border border-warning/40 bg-warning/10 backdrop-blur-md p-card-padding-sm shadow-card-hover max-h-[45vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-warning/25">
                <span className="font-bold text-body-sm text-warning">{title}</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={hideLabel}
                  className="w-6 h-6 rounded-full bg-warning/20 hover:bg-warning/30 text-warning flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {hasContent ? (
                <MediaMapProvider value={mediaMap ?? EMPTY_MEDIA_MAP}>
                  <div className="space-y-3 text-body-md leading-relaxed text-foreground">
                    {richTextBlocks.map((block) => (
                      <RichTextRenderer key={block.id} block={block} />
                    ))}
                  </div>
                </MediaMapProvider>
              ) : emptyLabel ? (
                <p className="text-body-sm text-muted-foreground text-center py-3">{emptyLabel}</p>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
