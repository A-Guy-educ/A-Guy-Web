'use client'

/**
 * CopyBlockButton
 *
 * "Copy to notebook" on one block of a rendered worksheet (an exercise in the
 * Scroll tab). The lesson notebook pane provides the copy through context, so
 * outside a pane (signed-out students) the button does not render. The block
 * is the button's closest `[data-cut-block]`; the button itself is kept out of
 * the image.
 */

import { Loader2, NotebookPen } from 'lucide-react'
import { createContext, useContext, useState } from 'react'

import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import { CUT_IGNORE_ATTR } from './dom-region-capture'

/** Marks a worksheet block that the copy button copies as a whole. */
export const CUT_BLOCK_ATTR = 'data-cut-block'

interface BlockCopy {
  busy: boolean
  copyBlock: (block: HTMLElement) => Promise<void>
}

export const BlockCopyContext = createContext<BlockCopy | null>(null)

export function CopyBlockButton({ className }: { className?: string }) {
  const t = useTranslations('courses.lessonNotebook')
  const blockCopy = useContext(BlockCopyContext)
  const [copying, setCopying] = useState(false)

  if (!blockCopy) return null

  const copy = (button: HTMLElement) => {
    const block = button.closest<HTMLElement>(`[${CUT_BLOCK_ATTR}]`)
    if (!block) return
    setCopying(true)
    blockCopy.copyBlock(block).finally(() => setCopying(false))
  }

  return (
    <button
      type="button"
      {...{ [CUT_IGNORE_ATTR]: '' }}
      disabled={blockCopy.busy}
      onClick={(e) => copy(e.currentTarget)}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 font-sans text-body-xs text-foreground shadow-elevation-1 hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-60 disabled:pointer-events-none transition-colors duration-normal print:hidden',
        className,
      )}
    >
      {copying ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <NotebookPen className="h-3.5 w-3.5" />
      )}
      {t('copyToNotebook')}
    </button>
  )
}
