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
import { useEffect, useRef, useState } from 'react'

import type { NotebookPage } from '@/infra/types/notebook'
import { useTranslations } from '@/ui/web/providers/I18n'
import type { InkTool } from './InkSurface'
import { NotebookPageCard } from './NotebookPageCard'
import { NotebookToolbar } from './NotebookToolbar'
import { useInkPalette } from './useInkPalette'
import type { useNotebookPages } from './useNotebookPages'

export { useNotebookPages, NEW_PAGE_HEIGHT } from './useNotebookPages'
export { flattenPageInk } from './flatten-page'
export { useInkPalette } from './useInkPalette'

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
  const [tool, setTool] = useState<InkTool>({ ink: 0, erase: false })
  const [fingerDraws, setFingerDraws] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const pageRefs = useRef(new Map<string, HTMLElement>())
  const { pages, status, addPage, setStrokes, extendPage, removePage } = notebook

  const activePage = pages.find((page) => page.id === activeId) ?? pages.at(-1) ?? null

  useEffect(() => {
    if (!focusPageId) return
    setActiveId(focusPageId)
    pageRefs.current.get(focusPageId)?.scrollIntoView({ block: 'start' })
  }, [focusPageId, pages.length])

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
    removePage(page.id).catch(() => onError(t('deleteFailed')))
  }

  return (
    <div className="relative flex flex-col gap-card-gap p-card-padding-sm md:p-card-padding">
      <NotebookToolbar
        inks={inks}
        tool={tool}
        fingerDraws={fingerDraws}
        canUndo={Boolean(activePage?.strokes.length)}
        status={status}
        onTool={setTool}
        onFingerDraws={setFingerDraws}
        onUndo={() => activePage && setStrokes(activePage.id, activePage.strokes.slice(0, -1))}
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

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-card-gap">
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
              onStrokes={(strokes) => setStrokes(page.id, strokes)}
              onActivate={() => setActiveId(page.id)}
              onExtend={() => extendPage(page.id)}
              onDelete={() => remove(page)}
              onCheck={() => onCheckPage(page, inks)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
