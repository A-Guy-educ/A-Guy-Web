/**
 * @fileType utility
 * @domain exercises
 * @pattern section-label-resolver
 * @ai-summary Derives one label per section group (and per question block within a group). If a section's `title` matches `סעיף X`, the captured X is used verbatim — so a subsection titled `סעיף ד3` renders as `ד3`. Otherwise the label auto-increments through the alphabet, skipping past any base letter already consumed by an explicit label (an explicit `ד3` bumps the next auto to `ה`, not `ג`). Multi-question sections extend the base label with a 1-based question suffix (`א`, `א1`, `א2`).
 */

import type { ExerciseBlockGroup, ContentBlock } from '@/infra/types/exercise'
import { HEBREW_LETTERS } from '@/ui/web/exerciserenderer/constants'

const HEBREW_LETTER_INDEX = new Map<string, number>(
  HEBREW_LETTERS.map((letter, idx) => [letter, idx]),
)

/** Matches a Payload section title of the form "סעיף X" — captures X (a single whitespace-free token, e.g. `א`, `ד3`). */
const SECTION_TITLE_RE = /^\s*סעיף\s+(\S+)\s*$/

/** Block types that count as "gradable questions" for the sub-numbering scheme. */
const QUESTION_BLOCK_TYPES = new Set<string>([
  'question_select',
  'question_free_response',
  'question_table',
  'question_matching',
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

/**
 * One label per section group, in group order. Preamble groups
 * (`sectionIndex === null`) get an empty string — they carry the exercise's
 * own blocks, not a labelled section.
 *
 * - Sections whose `title` matches `סעיף X` → label = X (verbatim, e.g. `ד3`)
 * - Otherwise → next auto-increment (א/ב/ג in Hebrew, a/b/c in English)
 *
 * An explicit label advances the auto-increment counter past its base letter,
 * so `[סעיף א, no-title, סעיף ד3, no-title]` produces `[א, ב, ד3, ה]`.
 */
export function computeSectionLabels(groups: ExerciseBlockGroup[], isHebrew: boolean): string[] {
  const labels: string[] = []
  let counter = 0
  for (const group of groups) {
    if (group.sectionIndex === null) {
      labels.push('')
      continue
    }
    const explicit = parseExplicitLabel(group.title)
    if (explicit !== null) {
      labels.push(explicit)
      const baseIdx = baseLetterIndex(explicit)
      if (baseIdx >= 0 && baseIdx + 1 > counter) counter = baseIdx + 1
      continue
    }
    labels.push(isHebrew ? hebrewLetter(counter) : englishLetter(counter))
    counter += 1
  }
  return labels
}

function isQuestionBlock(block: ContentBlock): boolean {
  return QUESTION_BLOCK_TYPES.has((block as { type?: string }).type ?? '')
}

/**
 * Build the question-id → label map given a pre-computed set of section
 * labels (one entry per group). Split out from `computeQuestionLabels` so
 * callers that render a subset of an exercise's groups (e.g. the chat view,
 * which hands each `ExerciseSectionBubble` a single group) can inject the
 * exercise-wide section label from the outside instead of having the
 * label restart at `א` for every isolated render.
 */
export function questionLabelsFromSectionLabels(
  groups: ExerciseBlockGroup[],
  sectionLabels: string[],
): Map<string, string> {
  const map = new Map<string, string>()
  groups.forEach((group, groupIdx) => {
    const questions = group.blocks.filter(isQuestionBlock)
    if (questions.length === 0) return
    const sectionLabel = sectionLabels[groupIdx] ?? ''
    questions.forEach((q, qIdx) => {
      const id = (q as { id?: string }).id
      if (!id) return
      const label = questions.length === 1 ? sectionLabel : `${sectionLabel}${qIdx + 1}`
      map.set(id, label)
    })
  })
  return map
}

/**
 * Map from `block.id` → the label that renderers should stamp on the
 * question card. Sections with a single gradable question use the section
 * label directly; sections with 2+ gradable questions append a 1-based
 * suffix (`א`, `א1`, `א2`).
 *
 * Non-question blocks (rich_text, media, svg, …) are not included in the
 * map — they don't get labelled.
 */
export function computeQuestionLabels(
  groups: ExerciseBlockGroup[],
  isHebrew: boolean,
): Map<string, string> {
  return questionLabelsFromSectionLabels(groups, computeSectionLabels(groups, isHebrew))
}
