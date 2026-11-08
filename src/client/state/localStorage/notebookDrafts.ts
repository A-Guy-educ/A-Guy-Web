/**
 * Unsaved notebook work, kept on the device. SSR-safe.
 *
 * A draft holds a page's latest strokes from the moment the student lifts the
 * pen until the server confirms it, so a refresh, a crash or a dropped
 * connection loses nothing. Drafts are user-scoped: the key prefix is listed
 * in USER_SCOPED_KEY_PREFIXES, so another student's sign-in wipes them.
 */

import type { NotebookStroke } from '@/infra/types/notebook'

export const NOTEBOOK_DRAFT_KEY_PREFIX = 'a-guy:notebook-draft:'

export interface NotebookDraft {
  /** The notebook the page belongs to, so drafts of deleted pages can be cleared. */
  scopeKey: string
  strokes: NotebookStroke[]
  height: number
  /** The server's `updatedAt` this draft was built on. */
  baseUpdatedAt: string
  /** Device clock, ms. Only used when the server copy changed underneath the draft. */
  editedAt: number
}

function isDraft(value: unknown): value is NotebookDraft {
  const draft = value as Partial<NotebookDraft> | null
  return (
    typeof draft?.scopeKey === 'string' &&
    Array.isArray(draft.strokes) &&
    typeof draft.height === 'number' &&
    typeof draft.baseUpdatedAt === 'string' &&
    typeof draft.editedAt === 'number'
  )
}

/** Returns false when the device could not store it (full or blocked storage). */
export function writeNotebookDraft(pageId: string, draft: NotebookDraft): boolean {
  if (typeof window === 'undefined') return false
  try {
    localStorage.setItem(`${NOTEBOOK_DRAFT_KEY_PREFIX}${pageId}`, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

export function removeNotebookDraft(pageId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(`${NOTEBOOK_DRAFT_KEY_PREFIX}${pageId}`)
  } catch {
    // Storage unavailable — nothing was stored either
  }
}

/** This notebook's drafts by page id. Unreadable entries are dropped. */
export function readNotebookDrafts(scopeKey: string): Map<string, NotebookDraft> {
  const drafts = new Map<string, NotebookDraft>()
  if (typeof window === 'undefined') return drafts
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
    for (const key of keys) {
      if (!key?.startsWith(NOTEBOOK_DRAFT_KEY_PREFIX)) continue
      const pageId = key.slice(NOTEBOOK_DRAFT_KEY_PREFIX.length)
      let parsed: unknown = null
      try {
        parsed = JSON.parse(localStorage.getItem(key) ?? 'null')
      } catch {
        // Corrupt entry — removed below
      }
      if (!isDraft(parsed)) localStorage.removeItem(key)
      else if (parsed.scopeKey === scopeKey) drafts.set(pageId, parsed)
    }
  } catch {
    // Storage unavailable — no drafts to restore
  }
  return drafts
}
