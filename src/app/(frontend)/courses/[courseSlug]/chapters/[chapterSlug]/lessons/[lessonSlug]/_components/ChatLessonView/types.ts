/**
 * @fileType types
 * @domain lessons
 * @ai-summary Types for the Chat view — a visual reskin of the Interactive
 *             tab. The runner walks the lesson's existing exercises section
 *             by section (via getExerciseBlockGroups), rendering each group
 *             as its own chat bubble. Freeform student questions go to the
 *             existing /api/agent/chat endpoint with the current exercise's
 *             context injected.
 */

import type { Exercise } from '@/infra/types/content'
import type { ContentBlock, ExerciseBlockGroup } from '@/infra/types/exercise'

/** Everything rendered in the chat stream is a StreamEntry. */
export type StreamEntry =
  | ExerciseIntroEntry
  | ExerciseSectionEntry
  | ChatUserEntry
  | ChatAssistantEntry
  | ChatPendingEntry
  | ChatErrorEntry
  | LessonCompleteEntry
  | TierLockEntry
  | SkippedMarkerEntry
  | QuotaExhaustedEntry

interface EntryBase {
  /** Stable React key + identity for dedupe / replacement. */
  key: string
}

/** "Exercise N: title" intro bubble — shown once per exercise (before its first section). */
export interface ExerciseIntroEntry extends EntryBase {
  kind: 'exercise-intro'
  exerciseIndex: number
  ordinal: number
  title?: string
  /** Top-level (pre-section) content blocks of the exercise — the "given
   *  data" (statement, figures, graphs, formulas). Rendered as an amber
   *  card right under the intro label so the student sees the problem
   *  context up front, matching what the show-data pill exposes. Excludes
   *  answer-required questions (they stay in their own section bubble).
   *  Undefined for exercises with no top-level given-data (e.g. algebra-
   *  only sections). */
  givenDataBlocks?: ContentBlock[]
}

/** One section (== one ExerciseBlockGroup) rendered inside a teacher bubble. */
export interface ExerciseSectionEntry extends EntryBase {
  kind: 'exercise-section'
  exerciseIndex: number
  ordinal: number
  exercise: Exercise
  group: ExerciseBlockGroup
  /** Number of question blocks in the group; 0 for intro-only groups. */
  questionCount: number
  /**
   * Exercise-wide section label (`א`, `ד3`, …). Used for the AI-context
   * header ("סעיף X") and matches the label of the section's first
   * question card. Empty string for preamble-only entries.
   */
  sectionLabel: string
  /**
   * Exercise-wide `block.id → label` map computed once by the walker.
   * Passed to `ExerciseSectionBubble` (and through to `ExerciseRenderer`)
   * so labels stay consistent across bubbles and untitled multi-question
   * sections keep their per-question `א/ב/ג` numbering instead of
   * restarting at `א` per rendered group.
   */
  questionLabels: Map<string, string>
}

/**
 * Right-aligned student bubble. Two sources feed this entry:
 *   1. Freeform questions typed into the ChatInputPanel (no `isCorrect`).
 *   2. Multiple-choice picks in the chat-native section renderer, which
 *      echoes the student's chosen option here with `isCorrect` set so
 *      StudentBubble can color the bubble green/red immediately.
 */
export interface ChatUserEntry extends EntryBase {
  kind: 'chat-user'
  text: string
  isCorrect?: boolean
}

/** Response from /api/agent/chat OR a canned "well done" line. */
export interface ChatAssistantEntry extends EntryBase {
  kind: 'chat-assistant'
  text: string
  /**
   * True while a streamed reply is still growing (chunks arriving). Turns
   * false on the terminal replace once the stream ends. Downstream effects
   * (TTS narration in particular) MUST skip streaming entries — otherwise
   * they'd narrate on the first ~80-char chunk and dedupe every subsequent
   * chunk, leaving blind users with only the opening fragment.
   *
   * Undefined for non-streamed entries (the canned "well done" bubble, or
   * anything appended synchronously) — treated as false.
   */
  streaming?: boolean
}

/** In-flight indicator while waiting for the AI response. */
export interface ChatPendingEntry extends EntryBase {
  kind: 'chat-pending'
}

/** Displayed when /api/agent/chat fails (network, quota, auth). */
export interface ChatErrorEntry extends EntryBase {
  kind: 'chat-error'
  text: string
}

/** Terminal bubble shown once the last section is done. */
export interface LessonCompleteEntry extends EntryBase {
  kind: 'lesson-complete'
}

/**
 * Terminal bubble shown when the lesson had more exercises than the student's
 * tier allows — stream stops at the capped exercise count and the lock card
 * announces how many more exercises are gated behind an upgrade.
 */
export interface TierLockEntry extends EntryBase {
  kind: 'tier-lock'
  /** How many exercises are still locked past the student's current access. */
  lockedCount: number
}

/**
 * Marker inserted between the student's last-answered section and the next
 * exercise's intro when they tap "דלג על תרגיל" (Task 8). The spec is
 * explicit that skipped sections should be *marked as skipped* without
 * reopening them — this entry gives the student a visual breadcrumb so the
 * walker's jump isn't silent, without re-rendering the sections they chose
 * to skip. Pure presentation, no state.
 */
export interface SkippedMarkerEntry extends EntryBase {
  kind: 'skipped-marker'
}

/**
 * Terminal explanatory bubble emitted the first time the student's chat
 * quota is exhausted (server returns 429 + `quotaExceeded: true`). Carries
 * the two CTAs — upgrade + continue — in a dedicated card so the student
 * can pick a path forward instead of staring at a generic error. Emitted
 * exactly once per `useChatChannel` instance (subsequent AI requests silently
 * no-op) and is the signal that enables no-AI mode downstream (Task 3's
 * retry hint CTA hides, Task 2's correction stays suppressed).
 */
export interface QuotaExhaustedEntry extends EntryBase {
  kind: 'quota-exhausted'
}

/**
 * Reported by ExerciseSectionBubble when the student finishes the section.
 * On a wrong outcome:
 *   - `correctAnswerText` is the expected answer text, when the section's
 *     blocks let us extract it (question_select options with
 *     `isCorrect` / `correctOptionId`). The runner no longer shows this
 *     inline — Task 2 removed the "correct answer: X" reveal bubble so a
 *     3-option retry (Task 3) can also follow the same path without
 *     leaking the solution before the second attempt. The text still
 *     flows through so the teacher-AI prompt can reference it.
 *   - `studentAnswerText` is the specific wrong option label the student
 *     picked, forwarded into the AI correction prompt so the teacher can
 *     explain *why that choice* is wrong instead of lecturing in the
 *     abstract. Comma-joined when the section had multiple questions
 *     and more than one was missed.
 */
export type SectionOutcome =
  { kind: 'correct' } | { kind: 'wrong'; correctAnswerText?: string; studentAnswerText?: string }
