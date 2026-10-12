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

import { useCallback, useRef, useState } from 'react'

const STORAGE_KEY_PREFIX = 'aguy:lessonChatProgress:'
const CORRECT_STATE_KEY_PREFIX = 'aguy:lessonChatCorrect:'
const STARTED_AT_KEY_PREFIX = 'aguy:lessonChatStartedAt:'
const STORAGE_VERSION = 1
const CORRECT_STATE_VERSION = 1
const STARTED_AT_VERSION = 1

interface SavedProgress {
  version: number
  stepCursor: number
}

interface SavedStartedAt {
  version: number
  startedAt: number
}

/**
 * Lesson-scoped state for the canned correct-answer reactions. Survives
 * refresh so the "first correct section → long variant, subsequent → short"
 * rule holds across a resumed lesson.
 */
export interface CorrectResponseState {
  /** Last chosen pair key (lesson-wide) — excluded on the next pick. */
  lastPairKey: string | null
  /** Per-exercise flag: has the long variant already fired? */
  longShownByExerciseId: Record<string, true>
}

interface SavedCorrectState {
  version: number
  state: CorrectResponseState
}

export interface LessonChatProgress {
  /** Walker step to resume from. Null on SSR / fresh browser / stored version mismatch. */
  initialStepCursor: number | null
  /** Persist the current walker step cursor. Best-effort — swallows storage errors. */
  saveStepCursor: (stepCursor: number) => void
  /** Snapshot of the canned-reaction state loaded on mount. */
  initialCorrectResponseState: CorrectResponseState
  /** Record a correct-answer reaction: updates lastPairKey + marks exercise as long-shown. */
  recordCorrectReaction: (exerciseId: string, pairKey: string) => void
  /** Current (live) correct-response state — reads reflect writes without re-render. */
  getCorrectResponseState: () => CorrectResponseState
  /**
   * Epoch ms when this lesson's chat view was first mounted. Written exactly
   * once per lesson entry (next mount preserves the original value) so the
   * Task-9 summary card can show "X דקות למידה פעילה" without the number
   * resetting across refreshes.
   */
  getLessonStartedAt: () => number
  /** Remove this lesson's saved progress. Called by Reset. */
  clearProgress: () => void
}

function storageKey(lessonId: string): string {
  return `${STORAGE_KEY_PREFIX}${lessonId}`
}

function correctStateKey(lessonId: string): string {
  return `${CORRECT_STATE_KEY_PREFIX}${lessonId}`
}

function startedAtKey(lessonId: string): string {
  return `${STARTED_AT_KEY_PREFIX}${lessonId}`
}

/**
 * Read the lesson's startedAt, or write + return `now` on the first visit.
 * Called inside a lazy useState so it fires once per mount; SSR falls back
 * to `Date.now()` in-memory only (hydration will re-run on the client and
 * either read the persisted value or persist its own).
 */
function readOrInitStartedAt(lessonId: string): number {
  if (typeof window === 'undefined') return Date.now()
  const key = startedAtKey(lessonId)
  try {
    const raw = window.localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as SavedStartedAt
      if (
        parsed.version === STARTED_AT_VERSION &&
        typeof parsed.startedAt === 'number' &&
        parsed.startedAt > 0
      ) {
        return parsed.startedAt
      }
    }
    const now = Date.now()
    const payload: SavedStartedAt = { version: STARTED_AT_VERSION, startedAt: now }
    window.localStorage.setItem(key, JSON.stringify(payload))
    return now
  } catch {
    // Private browsing / quota — return a session-only timestamp. The
    // summary card will show an elapsed-time computed from THIS mount
    // (not refresh-stable), which is still better than hiding it.
    return Date.now()
  }
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

function emptyCorrectState(): CorrectResponseState {
  return { lastPairKey: null, longShownByExerciseId: {} }
}

function readCorrectState(lessonId: string): CorrectResponseState {
  if (typeof window === 'undefined') return emptyCorrectState()
  try {
    const raw = window.localStorage.getItem(correctStateKey(lessonId))
    if (!raw) return emptyCorrectState()
    const parsed = JSON.parse(raw) as SavedCorrectState
    if (parsed.version !== CORRECT_STATE_VERSION) return emptyCorrectState()
    const state = parsed.state ?? emptyCorrectState()
    return {
      lastPairKey: typeof state.lastPairKey === 'string' ? state.lastPairKey : null,
      longShownByExerciseId:
        state.longShownByExerciseId && typeof state.longShownByExerciseId === 'object'
          ? state.longShownByExerciseId
          : {},
    }
  } catch {
    return emptyCorrectState()
  }
}

export function useLessonChatProgress(lessonId: string): LessonChatProgress {
  // Lazy init runs once on first client render. SSR gets null (useExerciseWalker
  // treats that as "start at 0"), then hydration keeps the same null — no
  // mismatch because the walker's resume path is purely a mount-time emit, not
  // a render-time branch.
  const [initialStepCursor] = useState<number | null>(() => readStorage(lessonId))
  const [initialCorrectResponseState] = useState<CorrectResponseState>(() =>
    readCorrectState(lessonId),
  )
  // `startedAt` is lazily initialized on first mount of the lesson (first
  // call persists `Date.now()`; subsequent mounts read the stored value).
  // Lives in a ref so later re-renders don't fork the timestamp.
  const startedAtRef = useRef<number>(0)
  if (startedAtRef.current === 0) {
    startedAtRef.current = readOrInitStartedAt(lessonId)
  }

  // Live state lives in a ref so callers can update + read in the same tick
  // (picker needs lastPairKey → pick → persist). Nothing re-renders when it
  // flips — the reaction text is already in the stream entry.
  const correctStateRef = useRef<CorrectResponseState>(initialCorrectResponseState)

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

  const recordCorrectReaction = useCallback(
    (exerciseId: string, pairKey: string) => {
      const next: CorrectResponseState = {
        lastPairKey: pairKey,
        longShownByExerciseId: {
          ...correctStateRef.current.longShownByExerciseId,
          [exerciseId]: true,
        },
      }
      correctStateRef.current = next
      if (typeof window === 'undefined') return
      try {
        const payload: SavedCorrectState = { version: CORRECT_STATE_VERSION, state: next }
        window.localStorage.setItem(correctStateKey(lessonId), JSON.stringify(payload))
      } catch {
        // See saveStepCursor.
      }
    },
    [lessonId],
  )

  const getCorrectResponseState = useCallback(() => correctStateRef.current, [])
  const getLessonStartedAt = useCallback(() => startedAtRef.current, [])

  const clearProgress = useCallback(() => {
    correctStateRef.current = emptyCorrectState()
    startedAtRef.current = 0
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(storageKey(lessonId))
      window.localStorage.removeItem(correctStateKey(lessonId))
      window.localStorage.removeItem(startedAtKey(lessonId))
    } catch {
      // See saveStepCursor.
    }
  }, [lessonId])

  return {
    initialStepCursor,
    saveStepCursor,
    initialCorrectResponseState,
    recordCorrectReaction,
    getCorrectResponseState,
    getLessonStartedAt,
    clearProgress,
  }
}
