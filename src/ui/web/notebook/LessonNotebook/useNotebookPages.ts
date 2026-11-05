'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  NotebookCut,
  NotebookPage,
  NotebookScope,
  NotebookStroke,
} from '@/infra/types/notebook'
import { logger } from '@/infra/utils/logger'
import * as api from './notebook-api'

/** Strokes save once the student pauses, not on every pointer-up. */
const SAVE_DELAY_MS = 800
export const NEW_PAGE_HEIGHT = 1150
export const EXTEND_BY = 600

export type NotebookStatus = 'loading' | 'ready' | 'saving' | 'error'

/**
 * A student's notebook pages for one scope (a lesson or an Ask room), with
 * debounced autosave.
 *
 * Local state is the source of truth while the notebook is open; the server
 * copy trails it by at most `SAVE_DELAY_MS`. Pending saves are flushed on
 * unmount so switching tabs or lessons never drops the last strokes.
 */
export function useNotebookPages(scope: NotebookScope, enabled: boolean) {
  // Effects key on the scope's identity, not the object, so a fresh-but-equal
  // scope from the caller each render doesn't refetch.
  const scopeKey = scope.kind === 'lesson' ? `lesson:${scope.lessonId}` : `ask:${scope.contextKey}`
  const scopeRef = useRef(scope)
  scopeRef.current = scope
  const [pages, setPages] = useState<NotebookPage[]>([])
  const [status, setStatus] = useState<NotebookStatus>('loading')
  const pending = useRef(new Map<string, { strokes: NotebookStroke[]; height: number }>())
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setPages([]) // never show the previous notebook's pages while the next loads
    setStatus('loading')
    api
      .fetchNotebookPages(scopeRef.current)
      .then((loaded) => {
        if (cancelled) return
        setPages(loaded)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        logger.error({ err }, '[notebook] Failed to load pages')
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [scopeKey, enabled])

  const flush = useCallback(async () => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
    const batch = [...pending.current.entries()]
    pending.current.clear()
    if (!batch.length) return
    setStatus('saving')
    try {
      await Promise.all(batch.map(([id, update]) => api.saveNotebookPage(id, update)))
      setStatus('ready')
    } catch (err) {
      logger.error({ err }, '[notebook] Failed to save pages')
      // Put the unsaved work back so the next change retries it.
      for (const [id, update] of batch) {
        if (!pending.current.has(id)) pending.current.set(id, update)
      }
      setStatus('error')
    }
  }, [])

  useEffect(() => () => void flush(), [flush])

  const schedule = useCallback(
    (page: NotebookPage) => {
      pending.current.set(page.id, { strokes: page.strokes, height: page.height })
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS)
    },
    [flush],
  )

  const changePage = useCallback(
    (pageId: string, change: (page: NotebookPage) => NotebookPage) => {
      setPages((current) =>
        current.map((page) => {
          if (page.id !== pageId) return page
          const next = change(page)
          schedule(next)
          return next
        }),
      )
    },
    [schedule],
  )

  const setStrokes = useCallback(
    (pageId: string, strokes: NotebookStroke[]) =>
      changePage(pageId, (page) => ({ ...page, strokes })),
    [changePage],
  )

  const extendPage = useCallback(
    (pageId: string) =>
      changePage(pageId, (page) => ({ ...page, height: page.height + EXTEND_BY })),
    [changePage],
  )

  const addPage = useCallback(
    async (cut: NotebookCut | null = null, height = NEW_PAGE_HEIGHT): Promise<NotebookPage> => {
      const page = await api.createNotebookPage({ scope: scopeRef.current, height, cut })
      setPages((current) => [...current, page])
      return page
    },
    [],
  )

  const removePage = useCallback(async (pageId: string) => {
    pending.current.delete(pageId)
    await api.deleteNotebookPage(pageId)
    setPages((current) => current.filter((page) => page.id !== pageId))
  }, [])

  return { pages, status, addPage, setStrokes, extendPage, removePage }
}
