/**
 * @fileType utility
 * @domain exercise-renderer
 * @ai-summary localStorage round-trip for the full per-exercise working state —
 *             user answers plus the submit outcome (checkResult + hasChecked +
 *             svg hotspot state). Keeping the "solved" visuals requires more
 *             than just answers: the green/red/locked styling is driven by
 *             checkResults, so a return visit with persisted answers but no
 *             checkResults would show the student's text in the box with the
 *             check button re-enabled — which reads as "nothing was done
 *             here." This util stores both in a single versioned bundle under
 *             a-guy:exercise-state:v1:<exerciseId>.
 *
 *             Legacy key `a-guy:answers:<exerciseId>` (answers-only, from
 *             before the solved-visuals work) is read as a fallback on first
 *             hydration so an in-flight student doesn't lose their text on
 *             deploy day; the next save writes the new key.
 */

import type { UserAnswer, CheckResult } from '../types'

const STORAGE_PREFIX = 'a-guy:exercise-state:v1:'
const LEGACY_ANSWERS_PREFIX = 'a-guy:answers:'
const STATE_VERSION = 1

export interface PersistedExerciseState {
  version: number
  answers: Record<string, UserAnswer>
  checkResults: Record<string, CheckResult>
  hasChecked: Record<string, boolean>
  svgAnswers: Record<string, UserAnswer>
  svgCheckResults: Record<string, CheckResult>
}

function storageKey(exerciseId: string): string {
  return `${STORAGE_PREFIX}${exerciseId}`
}

function legacyAnswersKey(exerciseId: string): string {
  return `${LEGACY_ANSWERS_PREFIX}${exerciseId}`
}

function emptyState(): Omit<PersistedExerciseState, 'version'> {
  return {
    answers: {},
    checkResults: {},
    hasChecked: {},
    svgAnswers: {},
    svgCheckResults: {},
  }
}

/**
 * Read the persisted bundle. Returns null when nothing is stored or when the
 * stored payload is unreadable. Falls back to the legacy answers-only key so a
 * mid-exercise student doesn't lose typed text when the new schema ships.
 */
export function readExerciseState(
  exerciseId: string,
): Omit<PersistedExerciseState, 'version'> | null {
  if (!exerciseId || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey(exerciseId))
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedExerciseState
      if (parsed.version === STATE_VERSION) {
        return {
          answers: parsed.answers ?? {},
          checkResults: parsed.checkResults ?? {},
          hasChecked: parsed.hasChecked ?? {},
          svgAnswers: parsed.svgAnswers ?? {},
          svgCheckResults: parsed.svgCheckResults ?? {},
        }
      }
    }
    // Legacy fallback: the pre-bundle schema stored answers directly under
    // a-guy:answers:<id>. Pull the answers forward; outcome state restarts
    // empty so the student just sees their text / selection with the check
    // button available again — acceptable one-time regression per student.
    const legacy = window.localStorage.getItem(legacyAnswersKey(exerciseId))
    if (legacy) {
      const parsed = JSON.parse(legacy) as Record<string, UserAnswer>
      return { ...emptyState(), answers: parsed }
    }
  } catch {
    // Corrupted JSON / storage unavailable — treat as no saved state.
  }
  return null
}

/**
 * Write the full bundle. Best-effort — swallows quota / private-mode errors.
 */
export function writeExerciseState(
  exerciseId: string,
  state: Omit<PersistedExerciseState, 'version'>,
): void {
  if (!exerciseId || typeof window === 'undefined') return
  try {
    const payload: PersistedExerciseState = { version: STATE_VERSION, ...state }
    window.localStorage.setItem(storageKey(exerciseId), JSON.stringify(payload))
  } catch {
    // Quota / private browsing — persistence is best-effort.
  }
}

/**
 * Drop the saved bundle AND the legacy answers-only key. Used by the chat
 * view's Reset button to wipe every exercise in the lesson at once.
 */
export function clearExerciseState(exerciseId: string): void {
  if (!exerciseId || typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(storageKey(exerciseId))
    window.localStorage.removeItem(legacyAnswersKey(exerciseId))
  } catch {
    // See writeExerciseState.
  }
}
