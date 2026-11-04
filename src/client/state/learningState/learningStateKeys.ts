/**
 * localStorage layout of the learning-state cache, and how it maps to the
 * server's `user-learning-states` documents. SSR-safe.
 *
 * - `exercise` / <exerciseId>: one versioned bundle under EXERCISE_STATE_PREFIX
 *   (review attempts use the key `review-<exerciseId>`).
 * - `lesson-chat` / <lessonId>: four keys (walker cursor, canned-reaction
 *   state, start time, completion percent) folded into one document.
 * - `exam-dates` / <courseId>: the `{ exams }` bundle under EXAM_DATES_PREFIX.
 */

import type { LearningStateRef, LearningStateValue } from '@/infra/learning-state/refs'

export const EXERCISE_STATE_PREFIX = 'a-guy:exercise-state:v1:'
export const EXAM_DATES_PREFIX = 'a-guy:exam-dates:'

/** Kinds stored as one JSON value under `<prefix><key>`. */
const SINGLE_KEY_PREFIXES = {
  exercise: EXERCISE_STATE_PREFIX,
  'exam-dates': EXAM_DATES_PREFIX,
} as const

export const LESSON_CHAT_KEY_PREFIXES = {
  progress: 'aguy:lessonChatProgress:',
  correct: 'aguy:lessonChatCorrect:',
  startedAt: 'aguy:lessonChatStartedAt:',
  percent: 'aguy:lessonChatPercent:',
} as const

type LessonChatPart = keyof typeof LESSON_CHAT_KEY_PREFIXES
const LESSON_CHAT_PARTS = Object.keys(LESSON_CHAT_KEY_PREFIXES) as LessonChatPart[]

function readJson(storageKey: string): unknown {
  const raw = localStorage.getItem(storageKey)
  return raw === null ? undefined : JSON.parse(raw)
}

/** The cached state for `ref`, or null when nothing is stored locally. */
export function readLocalLearningState(ref: LearningStateRef): LearningStateValue | null {
  if (typeof window === 'undefined') return null
  try {
    if (ref.kind !== 'lesson-chat') {
      const bundle = readJson(`${SINGLE_KEY_PREFIXES[ref.kind]}${ref.key}`)
      return bundle && typeof bundle === 'object' ? (bundle as LearningStateValue) : null
    }
    const parts = LESSON_CHAT_PARTS.flatMap((part) => {
      const value = readJson(`${LESSON_CHAT_KEY_PREFIXES[part]}${ref.key}`)
      return value === undefined ? [] : [[part, value] as const]
    })
    return parts.length > 0 ? Object.fromEntries(parts) : null
  } catch {
    return null // corrupted JSON / storage blocked — nothing usable
  }
}

/** Replace the cached state for `ref` with the server copy. */
export function writeLocalLearningState(ref: LearningStateRef, state: LearningStateValue): void {
  if (typeof window === 'undefined') return
  try {
    if (ref.kind !== 'lesson-chat') {
      localStorage.setItem(`${SINGLE_KEY_PREFIXES[ref.kind]}${ref.key}`, JSON.stringify(state))
      return
    }
    LESSON_CHAT_PARTS.forEach((part) => {
      const storageKey = `${LESSON_CHAT_KEY_PREFIXES[part]}${ref.key}`
      if (state[part] === undefined) localStorage.removeItem(storageKey)
      else localStorage.setItem(storageKey, JSON.stringify(state[part]))
    })
  } catch {
    // Quota / private mode — the lesson just starts from the server-less state
  }
}

/** Keys of every locally cached `exam-dates` state (for one-time upload). */
export function listLocalExamDateKeys(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
      .filter((key): key is string => key?.startsWith(EXAM_DATES_PREFIX) ?? false)
      .map((key) => key.slice(EXAM_DATES_PREFIX.length))
  } catch {
    return []
  }
}
