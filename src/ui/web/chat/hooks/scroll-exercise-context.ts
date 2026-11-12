/**
 * Scroll view ↔ chat exercise-context channel.
 *
 * The scroll view (`BlocksDocumentLessonView`) renders a lesson's exercises as
 * one document with no PDF behind it, so the server has nothing to attach to
 * the tutor prompt. Instead the view dispatches `SCROLL_EXERCISE_EVENT` on the
 * window whenever the exercise in view changes, and `useNotebookChat`
 * prepends a `<scroll-exercise>` block to the outgoing prompt — the same idea
 * as the Media tab's `<pdf-page>` block.
 *
 * Every message carries a short "currently viewing" tag. The exercise text
 * itself (answer-stripped, admin-authored, so no escape pass — see
 * exercise-context-prompt.ts) is only included when the exercise changed
 * since the last successful send, or every few turns so it doesn't age out
 * of the history window. Sending it on every turn would duplicate it into
 * each stored user message.
 */

export interface ScrollExerciseContext {
  exerciseId: string
  title: string
  /** 1-based position among the exercises rendered in the scroll view. */
  position: number
  total: number
  /** Answer-stripped exercise text from `formatExerciseContextMessage`. */
  content: string
}

/** Payload for the `scroll-exercise-change` event. `null` = scroll view unmounted. */
export type ScrollExerciseEventDetail = ScrollExerciseContext | null

export const SCROLL_EXERCISE_EVENT = 'scroll-exercise-change' as const

// Last published value, so a chat panel that mounts after the scroll view
// (e.g. a mobile drawer opened later) still knows what's on screen.
let lastPublished: ScrollExerciseEventDetail = null

export function publishScrollExercise(detail: ScrollExerciseEventDetail): void {
  lastPublished = detail
  window.dispatchEvent(new CustomEvent(SCROLL_EXERCISE_EVENT, { detail }))
}

export function getPublishedScrollExercise(): ScrollExerciseEventDetail {
  return lastPublished
}

/** Re-send the full exercise text after this many turns on the same exercise. */
export const SCROLL_EXERCISE_REFRESH_TURNS = 8

export const SCROLL_EXERCISE_BLOCK_REGEX = /^<scroll-exercise[\s\S]*?<\/scroll-exercise>\s*/

/** What the chat last sent successfully for the scroll view. */
export interface ScrollExerciseSentState {
  exerciseId: string
  /** Successful turns since the full text was last included. */
  turnsSinceContent: number
}

export function shouldIncludeScrollExerciseContent(
  context: ScrollExerciseContext,
  sent: ScrollExerciseSentState | null,
): boolean {
  if (!sent || sent.exerciseId !== context.exerciseId) return true
  return sent.turnsSinceContent >= SCROLL_EXERCISE_REFRESH_TURNS
}

/** Advance the sent-state after a successful turn. */
export function nextScrollExerciseSentState(
  context: ScrollExerciseContext,
  includedContent: boolean,
  sent: ScrollExerciseSentState | null,
): ScrollExerciseSentState {
  if (includedContent || !sent || sent.exerciseId !== context.exerciseId) {
    return { exerciseId: context.exerciseId, turnsSinceContent: 0 }
  }
  return { ...sent, turnsSinceContent: sent.turnsSinceContent + 1 }
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildPromptWithScrollExerciseContext(
  message: string,
  context: ScrollExerciseContext | null,
  includeContent: boolean,
): string {
  if (!context) return message
  const title = escapeAttr(context.title)
  const viewing =
    `The student is currently viewing exercise ${context.position} of ${context.total}` +
    `${title ? ` ("${title}")` : ''} in the lesson's scroll view.`
  const body = includeContent
    ? `${viewing}\n\n${context.content}`
    : `${viewing} Its content was shared earlier in this conversation.`
  return (
    `<scroll-exercise position="${context.position}" total="${context.total}" title="${title}">\n` +
    `${body}\n` +
    `</scroll-exercise>\n\n` +
    message
  )
}

export function stripScrollExerciseContext(content: string): string {
  return content.replace(SCROLL_EXERCISE_BLOCK_REGEX, '')
}
