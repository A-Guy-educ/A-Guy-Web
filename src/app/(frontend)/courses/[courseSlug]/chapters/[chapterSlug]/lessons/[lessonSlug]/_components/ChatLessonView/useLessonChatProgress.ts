/**
 * @fileType hook
 * @domain lessons
 * @ai-summary Persists the lesson chat view's walker position to localStorage
 *             so re-entering a lesson resumes on the student's current section
 *             instead of restarting from exercise 1. Scoped per-lesson, per-
 *             browser (no server round-trip). Chat Q&A messages are NOT
 *             persisted here — the backend conversation collection already
 *             stores them server-side; this hook only tracks walker progress.
 *
 *             Reset button calls clearProgress() before remounting ActiveChat
 *             so the fresh mount reads a cleared slate.
 */

'use client'

import { useCallback, useState } from 'react'

const STORAGE_KEY_PREFIX = 'aguy:lessonChatProgress:'
const STORAGE_VERSION = 1

interface SavedProgress {
  version: number
  stepCursor: number
}

export interface LessonChatProgress {
  /** Walker step to resume from. Null on SSR / fresh browser / stored version mismatch. */
  initialStepCursor: number | null
  /** Persist the current walker step cursor. Best-effort — swallows storage errors. */
  saveStepCursor: (stepCursor: number) => void
  /** Remove this lesson's saved progress. Called by Reset. */
  clearProgress: () => void
}

function storageKey(lessonId: string): string {
  return `${STORAGE_KEY_PREFIX}${lessonId}`
}

function readStorage(lessonId: string): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey(lessonId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedProgress
    if (parsed.version !== STORAGE_VERSION) return null
    return typeof parsed.stepCursor === 'number' && parsed.stepCursor >= 0
      ? parsed.stepCursor
      : null
  } catch {
    return null
  }
}

export function useLessonChatProgress(lessonId: string): LessonChatProgress {
  // Lazy init runs once on first client render. SSR gets null (useExerciseWalker
  // treats that as "start at 0"), then hydration keeps the same null — no
  // mismatch because the walker's resume path is purely a mount-time emit, not
  // a render-time branch.
  const [initialStepCursor] = useState<number | null>(() => readStorage(lessonId))

  const saveStepCursor = useCallback(
    (stepCursor: number) => {
      if (typeof window === 'undefined') return
      try {
        const payload: SavedProgress = { version: STORAGE_VERSION, stepCursor }
        window.localStorage.setItem(storageKey(lessonId), JSON.stringify(payload))
      } catch {
        // Private browsing / quota-exceeded — persistence is best-effort.
      }
    },
    [lessonId],
  )

  const clearProgress = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(storageKey(lessonId))
    } catch {
      // See saveStepCursor.
    }
  }, [lessonId])

  return { initialStepCursor, saveStepCursor, clearProgress }
}
