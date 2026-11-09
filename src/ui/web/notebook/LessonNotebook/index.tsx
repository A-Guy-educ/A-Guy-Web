'use client'

/**
 * LessonNotebook
 *
 * The student's notebook for one lesson: a vertical stack of pages, each
 * either a cut from the lesson material with room to solve below it, or a
 * blank page. Page state and autosave live in `useNotebookPages`, owned by
 * the caller so the document view can add cut pages while the notebook is
 * hidden.
 */

import { NotebookPen } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { NOTEBOOK_PAGE_WIDTH, type NotebookPage } from '@/infra/types/notebook'
import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import type { InkTool } from './InkSurface'
import { latestCutOf } from './LatestCutButton'
import { NotebookPageCard } from './NotebookPageCard'
import { NotebookToolbar } from './NotebookToolbar'
import { useInkPalette } from './useInkPalette'
import type { useNotebookPages } from './useNotebookPages'
import { useStrokeEditing } from './useStrokeEditing'

export { useNotebookPages, NEW_PAGE_HEIGHT } from './useNotebookPages'
export { flattenPageInk } from './flatten-page'
export { useInkPalette } from './useInkPalette'

const ZOOM_LEVELS = [1, 1.25, 1.5, 2]

interface LessonNotebookProps {
  notebook: ReturnType<typeof useNotebookPages>
  /** Scroll this page into view once it is rendered (a page that was just cut in). */
  focusPageId: string | null
  onCheckPage: (page: NotebookPage, inks: readonly string[]) => void
  onError: (message: string) => void
}

export function LessonNotebook({
  notebook,
  focusPageId,
  onCheckPage,
  onError,
}: LessonNotebookProps) {
  const t = useTranslations('courses.lessonNotebook')
  const inks = useInkPalette()
  const [tool, setTool] = useState<InkTool>({ ink: 0, mode: 'pen', size: 1 })
  const [fingerDraws, setFingerDraws] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef(new Map<string, HTMLElement>())
  const { pages, status, addPage, setStrokes, extendPage, removePage } = notebook
  const editing = useStrokeEditing(setStrokes, () => onError(t('pageFull')))
  const zoom = ZOOM_LEVELS[zoomLevel]

  const activePage = pages.find((page) => page.id === activeId) ?? pages.at(-1) ?? null
  const latestCut = useMemo(() => latestCutOf(pages), [pages])

  useEffect(() => {
    if (!focusPageId) return
    setActiveId(focusPageId)
    pageRefs.current.get(focusPageId)?.scrollIntoView({ block: 'start' })
  }, [focusPageId, pages.length])

  const changeTool = (next: InkTool) => {
    if (next.mode !== 'lasso') editing.clearSelection()
    setTool(next)
  }

  // The caller's pane is what scrolls; keep the same spot in view as pages grow.
  const changeZoom = (direction: 1 | -1) => {
    const next = zoomLevel + direction
    if (next < 0 || next >= ZOOM_LEVELS.length) return
    const scroller = rootRef.current?.parentElement
    const scrollTop = scroller?.scrollTop ?? 0
    flushSync(() => setZoomLevel(next))
    if (scroller) scroller.scrollTop = (scrollTop * ZOOM_LEVELS[next]) / zoom
  }

  /** The middle of what's on screen of this page, in page units. */
  const visibleCenterY = (page: NotebookPage) => {
    const rect = pageRefs.current.get(page.id)?.getBoundingClientRect()
    const view = rootRef.current?.parentElement?.getBoundingClientRect()
    if (!rect || !view) return page.height / 2
    const middle = (Math.max(rect.top, view.top) + Math.min(rect.bottom, view.bottom)) / 2
    return ((middle - rect.top) * NOTEBOOK_PAGE_WIDTH) / rect.width
  }

  const paste = () => {
    if (!activePage) return
    editing.paste(activePage, visibleCenterY(activePage))
  }

  const addBlank = () => {
    addPage()
      .then((page) => {
        setActiveId(page.id)
        requestAnimationFrame(() =>
          pageRefs.current.get(page.id)?.scrollIntoView({ block: 'start' }),
        )
      })
      .catch(() => onError(t('addFailed')))
  }

  const remove = (page: NotebookPage) => {
    if (!window.confirm(t('deleteConfirm'))) return
    editing.clearSelection()
    removePage(page.id).catch(() => onError(t('deleteFailed')))
  }

  return (
    <div
      ref={rootRef}
      className="relative flex flex-col gap-card-gap p-card-padding-sm md:p-card-padding"
    >
      <NotebookToolbar
        latestCut={latestCut}
        inks={inks}
        tool={tool}
        fingerDraws={fingerDraws}
        canUndo={Boolean(activePage?.strokes.length)}
        canCopy={editing.selection !== null}
        canPaste={editing.canPaste && activePage !== null}
        zoom={zoom}
        canZoomIn={zoomLevel < ZOOM_LEVELS.length - 1}
        canZoomOut={zoomLevel > 0}
        status={status}
        onTool={changeTool}
        onFingerDraws={setFingerDraws}
        onUndo={() => activePage && editing.undo(activePage)}
        onCopy={editing.copySelection}
        onPaste={paste}
        onZoom={changeZoom}
        onBlankPage={addBlank}
      />

      {status !== 'loading' && pages.length === 0 && (
        <div className="mx-auto mt-10 flex max-w-sm flex-col items-center gap-content-gap text-center text-muted-foreground">
          <NotebookPen className="h-10 w-10 text-primary" />
          <p className="text-body-sm">{t('empty')}</p>
          <button
            type="button"
            onClick={addBlank}
            className="rounded-md bg-primary px-4 py-2 text-body-sm text-primary-foreground hover:bg-primary/90 transition-colors duration-normal"
          >
            {t('newBlankPage')}
          </button>
        </div>
      )}

      <div className={cn('mx-auto w-full max-w-4xl', zoom > 1 && 'overflow-x-auto')}>
        <div className="flex flex-col gap-card-gap" style={{ width: `${zoom * 100}%` }}>
          {pages.map((page, index) => (
            <div
              key={page.id}
              className="scroll-mt-16"
              ref={(el) => {
                if (el) pageRefs.current.set(page.id, el)
                else pageRefs.current.delete(page.id)
              }}
            >
              <NotebookPageCard
                page={page}
                pageNumber={index + 1}
                active={page.id === activePage?.id}
                inks={inks}
                tool={tool}
                fingerDraws={fingerDraws}
                selection={editing.selection?.pageId === page.id ? editing.selection : null}
                onStrokes={(strokes) => editing.applyStrokes(page, strokes)}
                onLasso={(loop) => editing.lasso(page, loop)}
                onMoveSelection={(dx, dy) => editing.moveSelection(page, dx, dy)}
                onClearSelection={editing.clearSelection}
                onActivate={() => setActiveId(page.id)}
                onExtend={() => extendPage(page.id)}
                onDelete={() => remove(page)}
                onCheck={() => onCheckPage(page, inks)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
