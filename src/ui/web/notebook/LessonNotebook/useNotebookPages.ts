'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  readNotebookDrafts,
  removeNotebookDraft,
  writeNotebookDraft,
} from '@/client/state/localStorage/notebookDrafts'
import type {
  NotebookCut,
  NotebookPage,
  NotebookScope,
  NotebookStroke,
} from '@/infra/types/notebook'
import { logger } from '@/infra/utils/logger'
import * as api from './notebook-api'
import {
  createNotebookSync,
  mergeDrafts,
  RETRY_MAX_MS,
  RETRY_MIN_MS,
  type NotebookSyncStatus,
} from './notebook-sync'

export const NEW_PAGE_HEIGHT = 1150
export const EXTEND_BY = 600

export type NotebookStatus = 'loading' | NotebookSyncStatus

/**
 * A student's notebook pages for one scope (a lesson or an Ask room).
 *
 * Writing never depends on the network: local state is the source of truth
 * while the notebook is open, every edit is stored on the device before it is
 * sent, and `notebook-sync` gets it to the server whenever it can. Anything
 * unsent is picked up from the device the next time this notebook opens.
 */
export function useNotebookPages(scope: NotebookScope, enabled: boolean) {
  // Effects key on the scope's identity, not the object, so a fresh-but-equal
  // scope from the caller each render doesn't refetch.
  const scopeKey = scope.kind === 'lesson' ? `lesson:${scope.lessonId}` : `ask:${scope.contextKey}`
  const scopeRef = useRef(scope)
  scopeRef.current = scope
  const [pages, setPages] = useState<NotebookPage[]>([])
  const [status, setStatus] = useState<NotebookStatus>('loading')
  // Mirrors `pages` so an edit can read the latest page and record it outside
  // a state updater, which React may run twice.
  const pagesRef = useRef<NotebookPage[]>([])
  const syncRef = useRef<ReturnType<typeof createNotebookSync> | null>(null)

  const commit = useCallback((next: NotebookPage[]) => {
    pagesRef.current = next
    setPages(next)
  }, [])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let loaded = false
    let loading = false
    let attempt = 0
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    commit([]) // never show the previous notebook's pages while the next loads
    setStatus('loading')

    const sync = createNotebookSync({
      scopeKey,
      save: (pageId, snapshot) => api.saveNotebookPage(pageId, snapshot),
      writeDraft: writeNotebookDraft,
      removeDraft: removeNotebookDraft,
      isOnline: () => navigator.onLine,
      onStatus: (next) => {
        if (loaded) setStatus(next)
      },
    })
    syncRef.current = sync

    const load = () => {
      if (loading || loaded) return
      loading = true
      api
        .fetchNotebookPages(scopeRef.current)
        .then((server) => {
          if (cancelled) return
          loaded = true
          const merged = mergeDrafts(server, readNotebookDrafts(scopeKey))
          merged.discard.forEach(removeNotebookDraft)
          server.forEach((page) => sync.noteVersion(page.id, page.updatedAt))
          commit(merged.pages)
          merged.restored.forEach(({ pageId, snapshot }) => sync.restore(pageId, snapshot))
          sync.report()
        })
        .catch((err: unknown) => {
          if (cancelled) return
          logger.warn({ err }, '[notebook] Failed to load pages, will retry')
          retryTimer = setTimeout(load, Math.min(RETRY_MAX_MS, RETRY_MIN_MS * 2 ** attempt++))
        })
        .finally(() => {
          loading = false
        })
    }
    load()

    const onOnline = () => {
      if (loaded) {
        sync.retryNow()
        return
      }
      if (retryTimer) clearTimeout(retryTimer)
      attempt = 0
      load()
    }
    const onOffline = () => sync.report()
    // Tablets suspend hidden tabs, so send what we can before that happens.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') sync.flush()
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisibility)
      sync.flush()
      sync.dispose()
      if (syncRef.current === sync) syncRef.current = null
    }
  }, [scopeKey, enabled, commit])

  const changePage = useCallback(
    (pageId: string, change: (page: NotebookPage) => NotebookPage) => {
      const page = pagesRef.current.find((candidate) => candidate.id === pageId)
      if (!page) return
      const next = change(page)
      commit(pagesRef.current.map((candidate) => (candidate.id === pageId ? next : candidate)))
      syncRef.current?.edit(pageId, { strokes: next.strokes, height: next.height })
    },
    [commit],
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
      syncRef.current?.noteVersion(page.id, page.updatedAt)
      commit([...pagesRef.current, page])
      return page
    },
    [commit],
  )

  const removePage = useCallback(
    async (pageId: string) => {
      await api.deleteNotebookPage(pageId)
      syncRef.current?.forget(pageId)
      commit(pagesRef.current.filter((page) => page.id !== pageId))
    },
    [commit],
  )

  return { pages, status, addPage, setStrokes, extendPage, removePage }
}
