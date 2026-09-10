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
 * Block types that count as a standalone labelled question — both the
 * interactive renderer and the printed worksheet apply badges to this
 * exact set. Excludes `question_geometry` and `question_axis` because
 * those render inline through GraphWithPrompt as diagram companions of
 * a nearby question, not as their own question units. Consuming a label
 * slot for them would visually skip a letter in interactive and drop a
 * stray badge next to a graph in scroll view.
 *
 * Exported so callers passing a custom `questionTypes` can narrow (e.g.
 * chat-native section bubbles that render only select/free-response),
 * but the default behaviour matches every renderer we ship today.
 */
export const INTERACTIVE_QUESTION_TYPES: ReadonlySet<string> = new Set<string>([
  'question_select',
  'question_free_response',
  'question_table',
  'question_matching',
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
 * Map from `block.id` → the section-letter badge for that block. One
 * label per SECTION, stamped only on the FIRST gradable question in the
 * section — every other block in the same section (including additional
 * question cards) renders WITHOUT a badge, visually flowing beneath the
 * first card's label. This matches the "a section can have 4 blocks and
 * they all sit under the same label" spec: a section with 3 selects
 * shows one `א` badge on the first card, not `א1/א2/א3`.
 *
 * - **Titled section** (`title` matches `סעיף X`): first question in the
 *   section carries `X` verbatim (e.g. `ד3` for a subsection). The
 *   counter then advances past X's base letter so the next untitled
 *   section doesn't collide with the parent (`ד3` pushes the next auto
 *   to `ה`, not `ד`).
 *
 * - **Untitled section / legacy preamble**: first question carries the
 *   next auto-letter; the counter advances by one per section, not per
 *   question.
 *
 * `questionTypes` narrows which block types count as questions. The
 * default (`INTERACTIVE_QUESTION_TYPES`) matches every current renderer
 * — override only when the caller renders a strict subset (e.g. chat-
 * native section bubbles that only draw select / free-response cards).
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
    const sectionLabel = explicit ?? autoLetter(counter, isHebrew)
    const firstId = (questions[0] as { id?: string }).id
    if (firstId) map.set(firstId, sectionLabel)
    if (explicit !== null) {
      const baseIdx = baseLetterIndex(explicit)
      if (baseIdx >= 0 && baseIdx + 1 > counter) counter = baseIdx + 1
    } else {
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
