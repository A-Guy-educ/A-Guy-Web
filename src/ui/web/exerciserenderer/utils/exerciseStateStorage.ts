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

export interface BlockMeta {
  /**
   * Option IDs the student picked wrong on prior attempts, before landing on
   * a final answer. Drives the 3-option retry UI in ChatQuestionSelectBubble:
   * each entry stays locked + marked wrong, remaining options are selectable
   * for a second attempt. Survives refresh so students don't get a reset
   * window to retry the same wrong answer twice.
   */
  wrongOptionIds?: string[]
  /**
   * True once the student requested the retry hint for this block. Persisted
   * so a mid-attempt refresh doesn't let the hint re-fire — the spec allows a
   * single hint per block.
   */
  hintShown?: boolean
  /**
   * Task-4 free-response submission history. Each entry is one attempt (text
   * the student typed + whether the pipeline accepted it). Preserved so a
   * future "end of lesson review" can surface what was tried without losing
   * prior typing when the student corrects or clarifies.
   */
  submissions?: BlockSubmission[]
  /**
   * Task-4 self-compare marker. Set when the student's open answer couldn't
   * be checked (AI quota exhausted → fallback to showing the solution for
   * self-comparison). Lets analytics / future review mode distinguish
   * "answered wrong" from "wasn't checked at all".
   */
  notChecked?: boolean
}

export interface BlockSubmission {
  text: string
  isCorrect: boolean
  /** Epoch ms. Lets a later review surface the order in a mixed-section lesson. */
  at: number
  /** Whether the pipeline fell back to self-compare without AI. */
  notChecked?: boolean
}

export interface PersistedExerciseState {
  version: number
  answers: Record<string, UserAnswer>
  checkResults: Record<string, CheckResult>
  hasChecked: Record<string, boolean>
  svgAnswers: Record<string, UserAnswer>
  svgCheckResults: Record<string, CheckResult>
  /** Per-block Task-3 retry/hint state. Optional for backward compat. */
  blockMeta?: Record<string, BlockMeta>
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
    blockMeta: {},
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
          blockMeta: parsed.blockMeta ?? {},
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
 * Merge a single block's answer / check result into the bundle. The chat-
 * native bubbles (ChatQuestionSelectBubble, ChatFreeResponseBubble) bypass
 * ExerciseRenderer and only know about their own block id, so they use this
 * helper instead of writing the whole bundle. Keeps every section writing to
 * one key per exercise, so Reset + cross-tab stay consistent.
 */
export function patchExerciseStateBlock(
  exerciseId: string,
  blockId: string,
  patch: { answer?: UserAnswer; checkResult?: CheckResult },
): void {
  if (!exerciseId || !blockId || typeof window === 'undefined') return
  const current = readExerciseState(exerciseId) ?? emptyState()
  const next: Omit<PersistedExerciseState, 'version'> = {
    answers: patch.answer ? { ...current.answers, [blockId]: patch.answer } : current.answers,
    checkResults: patch.checkResult
      ? { ...current.checkResults, [blockId]: patch.checkResult }
      : current.checkResults,
    hasChecked: patch.checkResult ? { ...current.hasChecked, [blockId]: true } : current.hasChecked,
    svgAnswers: current.svgAnswers,
    svgCheckResults: current.svgCheckResults,
    blockMeta: current.blockMeta,
  }
  writeExerciseState(exerciseId, next)
}

/**
 * Merge a block's Task-3 retry metadata (prior wrong picks + hint-shown flag).
 * Separate from `patchExerciseStateBlock` so a `patch` that only writes meta
 * can't accidentally stomp on `answers` / `checkResults` (and vice versa).
 */
export function patchExerciseStateBlockMeta(
  exerciseId: string,
  blockId: string,
  patch: Partial<BlockMeta>,
): void {
  if (!exerciseId || !blockId || typeof window === 'undefined') return
  const current = readExerciseState(exerciseId) ?? emptyState()
  const currentMeta = current.blockMeta?.[blockId] ?? {}
  const nextMeta: BlockMeta = { ...currentMeta, ...patch }
  const next: Omit<PersistedExerciseState, 'version'> = {
    ...current,
    blockMeta: { ...(current.blockMeta ?? {}), [blockId]: nextMeta },
  }
  writeExerciseState(exerciseId, next)
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
