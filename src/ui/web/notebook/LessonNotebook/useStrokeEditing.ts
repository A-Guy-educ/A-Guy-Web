'use client'

import { useCallback, useRef, useState } from 'react'

import {
  NOTEBOOK_MAX_STROKES,
  type NotebookPage,
  type NotebookStroke,
} from '@/infra/types/notebook'
import { clampOffset, liftStrokes, scaleStrokes, strokesBounds, translateStrokes } from './lasso'

const MAX_UNDO_STEPS = 50
/** Pasted strokes sit slightly off their source, so a paste over the original shows. */
const PASTE_NUDGE = 24

export interface StrokeSelection {
  pageId: string
  /** The caught ink, drawn by the lasso layer so it can follow a drag. */
  selected: NotebookStroke[]
  /** Everything else on the page, drawn by the ink surface while selected. */
  rest: NotebookStroke[]
}

/**
 * Undo history and the lasso selection for a notebook. A lasso move reorders
 * strokes, so undo can't just drop the last one: each edit records the page's
 * previous strokes. Pages opened with no history yet still undo their newest
 * stroke, as they always have.
 */
export function useStrokeEditing(
  setStrokes: (pageId: string, strokes: NotebookStroke[]) => void,
  onPageFull: () => void,
) {
  const history = useRef(new Map<string, NotebookStroke[][]>())
  const [selection, setSelection] = useState<StrokeSelection | null>(null)
  const [clipboard, setClipboard] = useState<NotebookStroke[] | null>(null)

  const clearSelection = useCallback(() => setSelection(null), [])

  const applyStrokes = useCallback(
    (page: NotebookPage, strokes: NotebookStroke[]) => {
      const past = history.current.get(page.id) ?? []
      history.current.set(page.id, [...past, page.strokes].slice(-MAX_UNDO_STEPS))
      setStrokes(page.id, strokes)
    },
    [setStrokes],
  )

  const undo = useCallback(
    (page: NotebookPage) => {
      setSelection(null)
      const past = history.current.get(page.id) ?? []
      if (!past.length) {
        setStrokes(page.id, page.strokes.slice(0, -1))
        return
      }
      history.current.set(page.id, past.slice(0, -1))
      setStrokes(page.id, past[past.length - 1])
    },
    [setStrokes],
  )

  const lasso = useCallback((page: NotebookPage, loop: readonly number[]) => {
    const lifted = liftStrokes(page.strokes, loop)
    setSelection(lifted.selected.length ? { pageId: page.id, ...lifted } : null)
  }, [])

  const replaceSelection = useCallback(
    (page: NotebookPage, change: (selected: NotebookStroke[]) => NotebookStroke[]) => {
      if (!selection) return
      const changed = change(selection.selected)
      // On top of the page, so erasers from before the change can't touch it.
      const next = [...selection.rest, ...changed]
      if (next.length > NOTEBOOK_MAX_STROKES) {
        onPageFull()
        return
      }
      applyStrokes(page, next)
      setSelection({ ...selection, selected: changed })
    },
    [selection, applyStrokes, onPageFull],
  )

  const moveSelection = useCallback(
    (page: NotebookPage, dx: number, dy: number) =>
      replaceSelection(page, (selected) => translateStrokes(selected, dx, dy)),
    [replaceSelection],
  )

  /** Scales the selection from its top-left corner. */
  const resizeSelection = useCallback(
    (page: NotebookPage, scale: number) =>
      replaceSelection(page, (selected) => {
        const { left, top } = strokesBounds(selected)
        return scaleStrokes(selected, left, top, scale)
      }),
    [replaceSelection],
  )

  const copySelection = useCallback(() => {
    if (selection) setClipboard(selection.selected)
  }, [selection])

  const paste = useCallback(
    (page: NotebookPage, centerY: number) => {
      if (!clipboard) return
      if (page.strokes.length + clipboard.length > NOTEBOOK_MAX_STROKES) {
        onPageFull()
        return
      }
      const bounds = strokesBounds(clipboard)
      const { dx, dy } = clampOffset(
        bounds,
        PASTE_NUDGE,
        centerY - (bounds.top + bounds.bottom) / 2,
        page.height,
      )
      const pasted = translateStrokes(clipboard, dx, dy)
      applyStrokes(page, [...page.strokes, ...pasted])
      setSelection({ pageId: page.id, selected: pasted, rest: page.strokes })
    },
    [clipboard, applyStrokes, onPageFull],
  )

  return {
    selection,
    canPaste: clipboard !== null,
    applyStrokes,
    undo,
    lasso,
    moveSelection,
    resizeSelection,
    copySelection,
    paste,
    clearSelection,
  }
}
