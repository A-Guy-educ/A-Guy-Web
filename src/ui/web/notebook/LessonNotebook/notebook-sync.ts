/**
 * @fileType utility
 * @domain notebook
 * @ai-summary Keeps a notebook's edits safe and gets them to the server. Writing never waits on it: each edit goes to a device draft first, then saves in the background, one request per page at a time so an older save can't overwrite a newer one. Failures retry with backoff and immediately when the browser is back online.
 */
import type { NotebookDraft } from '@/client/state/localStorage/notebookDrafts'
import type { NotebookPage, NotebookStroke } from '@/infra/types/notebook'
import { logger } from '@/infra/utils/logger'
import { NotebookRequestError } from './notebook-api'

/** Strokes save once the student pauses, not on every pointer-up. */
export const SAVE_DELAY_MS = 800
export const RETRY_MIN_MS = 2_000
export const RETRY_MAX_MS = 30_000

export type NotebookSyncStatus =
  /** Everything is on the server. */
  | 'synced'
  | 'saving'
  /** Not on the server yet, but safe on this device. */
  | 'savedLocally'
  /** Not on the server and the device could not store it either. */
  | 'unsaved'

export interface PageSnapshot {
  strokes: NotebookStroke[]
  height: number
}

interface NotebookSyncOptions {
  scopeKey: string
  /** Persist one page; resolves to the server's new `updatedAt`. */
  save: (pageId: string, snapshot: PageSnapshot) => Promise<string>
  writeDraft: (pageId: string, draft: NotebookDraft) => boolean
  removeDraft: (pageId: string) => void
  isOnline: () => boolean
  onStatus: (status: NotebookSyncStatus) => void
}

/**
 * Whether a device draft should replace the page the server returned. If the
 * server copy is the one the draft was built on, the draft is simply newer.
 * If it changed since (a save whose reply never arrived, or another device),
 * the most recent edit wins.
 */
export function draftWins(page: NotebookPage, draft: NotebookDraft): boolean {
  return draft.baseUpdatedAt === page.updatedAt || draft.editedAt >= Date.parse(page.updatedAt)
}

/**
 * Combine what the server returned with this notebook's device drafts.
 * `restored` still has to be uploaded; `discard` are drafts that lost to a
 * newer server copy or whose page no longer exists.
 */
export function mergeDrafts(server: NotebookPage[], drafts: Map<string, NotebookDraft>) {
  const restored: { pageId: string; snapshot: PageSnapshot }[] = []
  const discard = new Set(drafts.keys())

  const pages = server.map((page) => {
    const draft = drafts.get(page.id)
    if (!draft || !draftWins(page, draft)) return page
    discard.delete(page.id)
    const snapshot = { strokes: draft.strokes, height: draft.height }
    restored.push({ pageId: page.id, snapshot })
    return { ...page, ...snapshot }
  })

  return { pages, restored, discard: [...discard] }
}

export function createNotebookSync({
  scopeKey,
  save,
  writeDraft,
  removeDraft,
  isOnline,
  onStatus,
}: NotebookSyncOptions) {
  const dirty = new Map<string, PageSnapshot>()
  const inFlight = new Set<string>()
  const versions = new Map<string, string>()
  /** Pages whose latest edit the device failed to store. */
  const notOnDevice = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | null = null
  let retryDelay = 0
  let failing = false
  let disposed = false

  const report = () => {
    if (disposed) return
    if (!dirty.size && !inFlight.size) onStatus('synced')
    else if (failing || !isOnline()) onStatus(notOnDevice.size ? 'unsaved' : 'savedLocally')
    else onStatus('saving')
  }

  const arm = (delay: number) => {
    if (disposed) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, delay)
  }

  const nextRetryDelay = () => {
    retryDelay = retryDelay ? Math.min(retryDelay * 2, RETRY_MAX_MS) : RETRY_MIN_MS
    return retryDelay
  }

  const send = async (pageId: string, snapshot: PageSnapshot) => {
    dirty.delete(pageId)
    inFlight.add(pageId)
    report()
    try {
      versions.set(pageId, await save(pageId, snapshot))
      failing = false
      retryDelay = 0
      if (!dirty.has(pageId)) {
        removeDraft(pageId)
        notOnDevice.delete(pageId)
      }
    } catch (err) {
      if (err instanceof NotebookRequestError && err.status === 404) {
        // The page no longer exists; retrying can never succeed.
        dirty.delete(pageId)
        removeDraft(pageId)
        notOnDevice.delete(pageId)
      } else {
        logger.warn({ err }, '[notebook] Save failed, will retry')
        if (!dirty.has(pageId)) dirty.set(pageId, snapshot)
        failing = true
      }
    } finally {
      inFlight.delete(pageId)
      if (dirty.size && !timer) arm(failing ? nextRetryDelay() : SAVE_DELAY_MS)
      report()
    }
  }

  function flush() {
    if (timer) clearTimeout(timer)
    timer = null
    if (!isOnline()) {
      report() // the browser's `online` event restarts this
      return
    }
    for (const [pageId, snapshot] of dirty) {
      if (!inFlight.has(pageId)) void send(pageId, snapshot)
    }
  }

  return {
    /** Remember what the server has, so drafts can tell if it changed underneath them. */
    noteVersion(pageId: string, updatedAt: string) {
      versions.set(pageId, updatedAt)
    },

    /** Record an edit. Synchronous and never blocks: the draft is stored before this returns. */
    edit(pageId: string, snapshot: PageSnapshot) {
      const stored = writeDraft(pageId, {
        scopeKey,
        ...snapshot,
        baseUpdatedAt: versions.get(pageId) ?? '',
        editedAt: Date.now(),
      })
      if (stored) notOnDevice.delete(pageId)
      else notOnDevice.add(pageId)
      dirty.set(pageId, snapshot)
      // While saves are failing, keep the backoff instead of retrying per stroke.
      if (!failing || !timer) arm(failing ? nextRetryDelay() : SAVE_DELAY_MS)
      report()
    },

    /** Queue a draft recovered from the device; it is already stored, so just send it. */
    restore(pageId: string, snapshot: PageSnapshot) {
      dirty.set(pageId, snapshot)
      arm(SAVE_DELAY_MS)
      report()
    },

    forget(pageId: string) {
      dirty.delete(pageId)
      notOnDevice.delete(pageId)
      removeDraft(pageId)
      report()
    },

    flush,

    /** The connection came back: stop waiting out the backoff. */
    retryNow() {
      retryDelay = 0
      failing = false
      flush()
    },

    report,

    /** Stop timers. Whatever is unsent stays in its draft for the next time the notebook opens. */
    dispose() {
      if (timer) clearTimeout(timer)
      timer = null
      disposed = true
    },
  }
}
