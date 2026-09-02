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
  /** Rich-text blocks from the current section — treated as the exercise's
   *  "given data" (statement, figures, formulas). */
  richTextBlocks: RichTextBlock[]
  mediaMap?: Record<string, Media>
  showLabel: string
  hideLabel: string
  title: string
}

/**
 * Floating amber pill at top-start that toggles a dropdown showing the
 * current section's given data (rich_text blocks). Auto-collapses when the
 * student advances to a section that has different given data — so a stale
 * dropdown never overlays a new exercise's questions.
 *
 * Rendered inside the chat-view primary container (which is `relative`).
 */
export function GivenDataFloating({
  richTextBlocks,
  mediaMap,
  showLabel,
  hideLabel,
  title,
}: GivenDataFloatingProps) {
  const [open, setOpen] = useState(false)

  // Collapse when the underlying content changes (student advanced).
  // Uses block ids as the identity key to avoid churn on re-renders.
  const contentKey = richTextBlocks.map((b) => b.id).join('|')
  useEffect(() => {
    setOpen(false)
  }, [contentKey])

  if (richTextBlocks.length === 0) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'absolute top-3 start-3 z-40 pointer-events-auto',
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
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
            className="absolute top-14 inset-x-3 z-40 max-w-2xl mx-auto pointer-events-auto"
            dir="rtl"
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
              <MediaMapProvider value={mediaMap ?? EMPTY_MEDIA_MAP}>
                <div className="space-y-3 text-body-md leading-relaxed text-foreground">
                  {richTextBlocks.map((block) => (
                    <RichTextRenderer key={block.id} block={block} />
                  ))}
                </div>
              </MediaMapProvider>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
