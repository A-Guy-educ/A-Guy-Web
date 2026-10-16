/**
 * @fileType hook
 * @domain progress
 * @pattern chat-progress-map
 * @ai-summary Read-side companion to the chat view's `saveLessonPercent` writes.
 *             The chat view (`ChatLessonView`) does NOT write progress to the
 *             server-side Progress API — it only persists completion percent
 *             per lesson to localStorage. This hook lets the course page read
 *             those entries so the lesson-row rings reflect chat-view progress.
 *
 *             Returns `{}` on SSR and on the client's first render (to avoid
 *             hydration mismatch), then populates from localStorage after
 *             mount. Listens to `storage` events so other-tab writes update
 *             the course page while it's open.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'

// Must match the prefix + version written by `useLessonChatProgress` inside
// the chat view. If you rename either side, rename the other.
const LESSON_PERCENT_KEY_PREFIX = 'aguy:lessonChatPercent:'
const LESSON_PERCENT_VERSION = 1

interface SavedLessonPercent {
  version: number
  percent: number
  completed: boolean
  updatedAt: number
}

function readOne(lessonId: string): SavedLessonPercent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(`${LESSON_PERCENT_KEY_PREFIX}${lessonId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedLessonPercent
    if (parsed.version !== LESSON_PERCENT_VERSION) return null
    if (typeof parsed.percent !== 'number' || Number.isNaN(parsed.percent)) return null
    return parsed
  } catch {
    return null
  }
}

function readAll(lessonIds: string[]): Record<string, SavedLessonPercent> {
  const out: Record<string, SavedLessonPercent> = {}
  for (const id of lessonIds) {
    const entry = readOne(id)
    if (entry) out[id] = entry
  }
  return out
}

export function useChatProgressMap(lessonIds: string[]): {
  chatProgressMap: Record<string, number>
  chatCompletedMap: Record<string, boolean>
} {
  const idsKey = useMemo(() => [...lessonIds].sort().join(','), [lessonIds])
  const [entries, setEntries] = useState<Record<string, SavedLessonPercent>>({})

  useEffect(() => {
    setEntries(readAll(lessonIds))
    const handler = (e: StorageEvent) => {
      if (!e.key || !e.key.startsWith(LESSON_PERCENT_KEY_PREFIX)) return
      setEntries(readAll(lessonIds))
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
    // idsKey is the stable fingerprint of lessonIds — if the array identity
    // changes without the set of ids changing, we don't need to re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  return useMemo(() => {
    const chatProgressMap: Record<string, number> = {}
    const chatCompletedMap: Record<string, boolean> = {}
    for (const [id, entry] of Object.entries(entries)) {
      chatProgressMap[id] = entry.percent
      chatCompletedMap[id] = entry.completed
    }
    return { chatProgressMap, chatCompletedMap }
  }, [entries])
}
