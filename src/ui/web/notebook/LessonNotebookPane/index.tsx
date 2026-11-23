'use client'

/**
 * LessonNotebookPane
 *
 * A mini header that switches a lesson view's main area between the lesson
 * material and the student's notebook for that lesson. Used by the Media tab
 * (PDFs in the PDF.js iframe) and the Scroll tab (our own rendered
 * worksheet). Over PDFs and images, cutting is always on: a mouse or stylus
 * drag selects a region to send to a new notebook page or to the chat, while
 * a finger or the wheel still scrolls. The Scroll worksheet instead gives each
 * exercise a "copy to notebook" button (`CopyBlockButton`) — one tap, and no
 * cloning of the whole worksheet. The material stays mounted while the
 * notebook is open so it keeps its scroll position.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useMediaQuery } from '@/client/hooks/useMediaQuery'
import type { NotebookPage, NotebookScope } from '@/infra/types/notebook'
import { cn } from '@/infra/utils/ui'
import { LessonNotebook, useNotebookPages } from '@/ui/web/notebook/LessonNotebook'
import { BlockCopyContext } from '@/ui/web/notebook/RegionCut/CopyBlockButton'
import { CutSelection, type ViewportBox } from '@/ui/web/notebook/RegionCut/CutSelection'
import { captureDomBlock, prepareDomCapture } from '@/ui/web/notebook/RegionCut/dom-region-capture'
import { captureImageRegion } from '@/ui/web/notebook/RegionCut/image-region-capture'
import { capturePdfRegion } from '@/ui/web/notebook/RegionCut/pdf-region-capture'
import { CUT_SURFACE_ATTR, useCutSelection } from '@/ui/web/notebook/RegionCut/useCutSelection'
import { useRegionCut } from '@/ui/web/notebook/RegionCut/useRegionCut'
import { NotebookPaneHeader, type PaneView } from './NotebookPaneHeader'
import { NotebookQuotaPopup } from './NotebookQuotaPopup'
import { useCheckNotebookPage } from './useCheckNotebookPage'

export { CUT_SURFACE_ATTR }

/** Long enough for the worksheet to paint before the fonts are read. */
const FONT_PREFETCH_DELAY_MS = 1500

/**
 * What the material is, for cutting. `pdf` is the PDF.js viewer iframe;
 * `scroll` is rendered HTML whose worksheet carries `data-cut-surface` and
 * whose exercises are copied whole, by button;
 * `image` is an uploaded image, the `<img>` that carries that attribute.
 */
export type LessonCutSource =
  { kind: 'pdf' | 'image'; mediaId: string; label: string } | { kind: 'scroll'; label: string }

interface LessonNotebookPaneProps {
  /** Which notebook to show: a lesson's, or an Ask room's. */
  scope: NotebookScope
  /** `null` when the material cannot be cut from (e.g. a video). */
  cutSource: LessonCutSource | null
  children: React.ReactNode
  /** Desktop: lesson menu shown at the start of the header bar. */
  headerLeading?: React.ReactNode
}

export function LessonNotebookPane({
  scope,
  cutSource,
  children,
  headerLeading,
}: LessonNotebookPaneProps) {
  const [view, setView] = useState<PaneView>('material')
  const [focusPageId, setFocusPageId] = useState<string | null>(null)
  const materialRef = useRef<HTMLDivElement>(null)
  const notebook = useNotebookPages(scope, true)
  const checkPage = useCheckNotebookPage()
  // Any touchscreen, including hybrids — a finger there needs an explicit cut mode.
  const touchDevice = useMediaQuery('(any-pointer: coarse)')
  const [touchCut, setTouchCut] = useState(false)
  const kind = cutSource?.kind ?? null
  // The Scroll worksheet copies whole exercises by button instead of a drag.
  const dragCut = kind === 'pdf' || kind === 'image'
  const selection = useCutSelection(
    materialRef,
    view === 'material' && dragCut ? (kind === 'pdf' ? 'pdf' : 'dom') : null,
    touchDevice && touchCut,
  )
  const { clear: clearSelection } = selection
  // The first copy fetches every font; do it while the student is still reading.
  useEffect(() => {
    if (kind !== 'scroll' || view !== 'material') return
    const id = setTimeout(() => {
      const surface = materialRef.current?.querySelector<HTMLElement>(`[${CUT_SURFACE_ATTR}]`)
      if (surface) prepareDomCapture(surface)
    }, FONT_PREFETCH_DELAY_MS)
    return () => clearTimeout(id)
  }, [kind, view])
  // A finished cut hands scrolling back to the finger.
  const clear = useCallback(() => {
    clearSelection()
    setTouchCut(false)
  }, [clearSelection])

  const capture = useCallback(
    async (box: ViewportBox) => {
      const root = materialRef.current
      if (kind === 'pdf') {
        const iframe = root?.querySelector('iframe')
        return iframe ? capturePdfRegion(iframe, box) : null
      }
      const image = root?.querySelector<HTMLElement>(`[${CUT_SURFACE_ATTR}]`)
      return image instanceof HTMLImageElement ? captureImageRegion(image, box) : null
    },
    [kind],
  )
  const source = useMemo(
    () => (cutSource ? { ...cutSource } : { kind: 'scroll' as const, label: '' }),
    [cutSource],
  )
  const openCutPage = useCallback(
    (page: NotebookPage) => {
      clear()
      setFocusPageId(page.id)
      setView('notebook')
    },
    [clear],
  )
  const { busy, cut, cutWith } = useRegionCut({
    capture,
    source,
    addPage: notebook.addPage,
    onAddedToNotebook: openCutPage,
    onSentToChat: clear,
  })
  const blockCopy = useMemo(
    () =>
      kind === 'scroll'
        ? {
            busy,
            copyBlock: (block: HTMLElement) =>
              cutWith('notebook', async () => {
                const surface = block.closest<HTMLElement>(`[${CUT_SURFACE_ATTR}]`)
                return surface ? captureDomBlock(block, surface) : null
              }),
          }
        : null,
    [kind, busy, cutWith],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <NotebookPaneHeader
        view={view}
        onView={setView}
        pageCount={notebook.pages.length}
        cuttable={dragCut}
        touchDevice={touchDevice}
        touchCut={touchCut}
        onTouchCut={setTouchCut}
        leading={headerLeading}
      />

      <div
        ref={materialRef}
        className={cn('relative min-h-0 flex-1 flex-col', view === 'material' ? 'flex' : 'hidden')}
      >
        <BlockCopyContext.Provider value={blockCopy}>{children}</BlockCopyContext.Provider>
        {dragCut && (
          <CutSelection
            box={selection.box}
            dragging={selection.dragging}
            busy={busy}
            onCut={cut}
            onClear={clearSelection}
          />
        )}
      </div>

      <NotebookQuotaPopup />

      {view === 'notebook' && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <LessonNotebook
            notebook={notebook}
            focusPageId={focusPageId}
            onCheckPage={checkPage}
            onError={(message) => toast.error(message)}
          />
        </div>
      )}
    </div>
  )
}
