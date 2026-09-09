/**
 * @fileType utility
 * @domain exercises
 * @pattern section-label-resolver
 * @ai-summary Derives labels for exercise question cards and section headers. A section whose Payload `title` matches `סעיף X` gives all its questions the base X (single question → `X`; multiple → `X1`, `X2`, …), which is how the incoming "subsection" schema surfaces labels like `ד3` on the corresponding card. Untitled sections keep the pre-change per-question running counter across the whole exercise (so a legacy exercise with all questions in one preamble still shows `א/ב/ג`, not `א1/א2/א3`). An explicit label also bumps the counter past its base letter so the next auto label doesn't collide with the parent letter.
 */

import type { ExerciseBlockGroup, ContentBlock } from '@/infra/types/exercise'
import { HEBREW_LETTERS } from '@/ui/web/exerciserenderer/constants'

const HEBREW_LETTER_INDEX = new Map<string, number>(
  HEBREW_LETTERS.map((letter, idx) => [letter, idx]),
)

/** Matches a Payload section title of the form "סעיף X" — captures X (a single whitespace-free token, e.g. `א`, `ד3`). */
const SECTION_TITLE_RE = /^\s*סעיף\s+(\S+)\s*$/

/**
 * Types the interactive renderer (ExerciseRenderer) wraps in a QuestionCard
 * and stamps with a section-letter badge. Excludes `question_geometry` and
 * `question_axis` because those render inline through GraphWithPrompt with
 * no card wrapper (see the trailing comment in ExerciseRenderer's render
 * loop). Consuming a label slot for them would visually skip a letter in
 * the interactive view.
 */
export const INTERACTIVE_QUESTION_TYPES: ReadonlySet<string> = new Set<string>([
  'question_select',
  'question_free_response',
  'question_table',
  'question_matching',
])

/**
 * Types the printed worksheet (ExerciseWorksheet) stamps with a section-
 * letter badge. Adds geometry/axis on top of the interactive set because
 * WorksheetQuestionLabel wraps geometry/axis prompts too — each diagram
 * carries its own leading letter in the printed layout.
 */
export const WORKSHEET_QUESTION_TYPES: ReadonlySet<string> = new Set<string>([
  ...INTERACTIVE_QUESTION_TYPES,
  'question_geometry',
  'question_axis',
])

function englishLetter(idx: number): string {
  return String.fromCharCode('a'.charCodeAt(0) + idx)
}

function hebrewLetter(idx: number): string {
  return HEBREW_LETTERS[idx] ?? String(idx + 1)
}

/**
 * Return the 0-based alphabet index of the label's leading letter (Hebrew or
 * Latin). Returns -1 for labels that don't start with a recognised letter —
 * such labels don't advance the auto-increment counter.
 */
function baseLetterIndex(label: string): number {
  const first = label.charAt(0)
  const heb = HEBREW_LETTER_INDEX.get(first)
  if (heb !== undefined) return heb
  const code = first.toLowerCase().charCodeAt(0)
  if (code >= 97 && code <= 122) return code - 97
  return -1
}

function parseExplicitLabel(title: string | null | undefined): string | null {
  if (!title) return null
  const match = title.trim().match(SECTION_TITLE_RE)
  return match ? match[1] : null
}

function isQuestionBlock(block: ContentBlock, questionTypes: ReadonlySet<string>): boolean {
  return questionTypes.has((block as { type?: string }).type ?? '')
}

function autoLetter(idx: number, isHebrew: boolean): string {
  return isHebrew ? hebrewLetter(idx) : englishLetter(idx)
}

/**
 * Map from `block.id` → the label that renderers stamp on each question
 * card. Two schemes coexist inside the same running counter:
 *
 * - **Titled section** (`title` matches `סעיף X`): all questions in the
 *   section share the base X. A single question renders as `X`; multiple
 *   questions render as `X1`, `X2`, … so chat can still reference a
 *   specific one. The counter then advances past X's base letter so the
 *   next untitled section doesn't collide with the parent letter (`ד3`
 *   pushes the next auto to `ה`, not `ד`).
 *
 * - **Untitled section / legacy preamble** (any group with no `סעיף X`
 *   title): each question consumes one auto-letter. Matches the pre-
 *   change per-question counter so legacy exercises whose questions live
 *   directly in `exercise.content.blocks` still show `א/ב/ג` and multi-
 *   question untitled sections don't collapse to `א1/א2`.
 *
 * `questionTypes` narrows which block types get a label — pass
 * `INTERACTIVE_QUESTION_TYPES` (default) for ExerciseRenderer, or
 * `WORKSHEET_QUESTION_TYPES` for ExerciseWorksheet and the solutions
 * list. Using the wrong set silently skips letters (geometry claims a
 * slot but renders no badge) or leaves visible blocks unlabelled.
 */
export function computeQuestionLabels(
  groups: ExerciseBlockGroup[],
  isHebrew: boolean,
  questionTypes: ReadonlySet<string> = INTERACTIVE_QUESTION_TYPES,
): Map<string, string> {
  const map = new Map<string, string>()
  let counter = 0
  for (const group of groups) {
    const questions = group.blocks.filter((b) => isQuestionBlock(b, questionTypes))
    if (questions.length === 0) continue
    const explicit = group.sectionIndex !== null ? parseExplicitLabel(group.title) : null
    if (explicit !== null) {
      questions.forEach((q, qIdx) => {
        const id = (q as { id?: string }).id
        if (!id) return
        const label = questions.length === 1 ? explicit : `${explicit}${qIdx + 1}`
        map.set(id, label)
      })
      const baseIdx = baseLetterIndex(explicit)
      if (baseIdx >= 0 && baseIdx + 1 > counter) counter = baseIdx + 1
      continue
    }
    for (const q of questions) {
      const id = (q as { id?: string }).id
      if (!id) continue
      map.set(id, autoLetter(counter, isHebrew))
      counter += 1
    }
  }
  return map
}

/**
 * One label per section group, in group order. Used for section headers
 * (chat AI-context "סעיף X", ExerciseSectionBubble's exercise-wide badge).
 * Derived to stay in lockstep with `computeQuestionLabels`:
 *
 * - Titled section → the parsed `X` (verbatim; ignores question count).
 * - Untitled section with questions → the first question's auto-letter,
 *   so referring to "סעיף ג" points at the section whose first card the
 *   student sees as `ג`.
 * - Group with no gradable questions (typical preamble carrying only
 *   statement + figures) → `''` (no header letter).
 */
export function computeSectionLabels(
  groups: ExerciseBlockGroup[],
  isHebrew: boolean,
  questionTypes: ReadonlySet<string> = INTERACTIVE_QUESTION_TYPES,
): string[] {
  const questionLabels = computeQuestionLabels(groups, isHebrew, questionTypes)
  return groups.map((group) => {
    const explicit = group.sectionIndex !== null ? parseExplicitLabel(group.title) : null
    if (explicit !== null) return explicit
    const firstQ = group.blocks.find((b) => isQuestionBlock(b, questionTypes))
    if (!firstQ) return ''
    const id = (firstQ as { id?: string }).id
    return (id && questionLabels.get(id)) || ''
  })
}
