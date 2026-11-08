/**
 * @fileType utility
 * @domain lessons
 * @ai-summary Single source of the per-section independence outcome
 *             (alone / with-help / skipped / wrong). The student's end-of-lesson
 *             summary feeds it facts from localStorage; the teacher dashboard
 *             feeds it facts from question-attempts. Pure — no storage, no React,
 *             so both the client and the server import it.
 */

import type { Exercise } from '@/infra/types/content'
import type { ExerciseBlockGroup } from '@/infra/types/exercise'
import { getExerciseBlockGroups } from './getExerciseBlocks'

/**
 * Block types that always require the student to submit an answer. These
 * stay in their own section walker step so their answer UI renders.
 * Non-interactive display blocks (rich_text, static svg, latex, html,
 * media, display-only axis/geometry graphs) fall into "given data" and
 * move into the intro card.
 */
const ALWAYS_ANSWER_REQUIRED_BLOCK_TYPES = new Set([
  'question_select',
  'question_free_response',
  'question_table',
  'question_matching',
  'question_equation',
])

/**
 * `svg` is a display type by default, but SVGBlock supports interactive
 * hotspots (`interactive: true` with a non-empty `hotspots` array + a
 * `correctHotspotIds` grading rule — see SvgBlock in `types.ts`). When
 * that's the case ExerciseRenderer renders it inside a graded
 * QuestionCard, so we must treat it as answer-required. Static SVG
 * figures (no `interactive` flag) stay in given data.
 */
function isInteractiveSvg(block: { type: string; [key: string]: unknown }): boolean {
  if (block.type !== 'svg') return false
  const interactive = (block as { interactive?: boolean }).interactive === true
  const hotspots = (block as { hotspots?: unknown[] }).hotspots
  return interactive && Array.isArray(hotspots) && hotspots.length > 0
}

/**
 * Whether a block needs an answer input. Shared by the chat walker (to decide
 * which groups keep a walker step), the runner (given-data pill) and the
 * section counter below, so they never drift apart on a new block type.
 */
export function isAnswerRequired(block: { type: string; [key: string]: unknown }): boolean {
  if (ALWAYS_ANSWER_REQUIRED_BLOCK_TYPES.has(block.type)) return true
  return isInteractiveSvg(block)
}

/**
 * Section-level outcome. Mirrors the four buckets in the summary card's
 * breakdown row: "נכון ללא עזרה / נכון עם רמז או הסבר / דילגת / הסתיימו בטעות".
 */
export type SectionOutcome = 'alone' | 'with-help' | 'skipped' | 'wrong'

/** What happened on one answer-required block, however it was recorded. */
export interface AnswerBlockFacts {
  answered: boolean
  /** Meaningful only when `answered`; false = the block ended on a wrong answer. */
  finalCorrect: boolean
  hadWrongAttempt: boolean
  hintUsed: boolean
  explanationUsed: boolean
  /** Student compared against the solution instead of getting a checked verdict. */
  selfChecked: boolean
}

/**
 * Reduce one section's answer blocks into a single outcome. Any block that
 * ended wrong makes the section wrong; nothing answered is skipped; otherwise
 * any help (wrong attempt, hint, explanation, self-check) demotes alone to
 * with-help. A section with no answer blocks (display-only) counts as alone
 * so intro-only sections don't drag the index down.
 */
export function classifySectionOutcome(blocks: AnswerBlockFacts[]): SectionOutcome {
  if (blocks.length === 0) return 'alone'
  if (blocks.some((b) => b.answered && !b.finalCorrect)) return 'wrong'
  if (!blocks.some((b) => b.answered)) return 'skipped'
  const anyHelp = blocks.some(
    (b) => b.hadWrongAttempt || b.hintUsed || b.explanationUsed || b.selfChecked,
  )
  return anyHelp ? 'with-help' : 'alone'
}

export interface CountedSection {
  /** Index into `getExerciseBlockGroups(exercise)`. */
  groupIndex: number
  group: ExerciseBlockGroup
  answerBlocks: ExerciseBlockGroup['blocks']
}

/**
 * The sections of an exercise that the summary counts, in lesson order.
 * Mirrors the walker's filter: a top-level group (sectionIndex === null) with
 * no answer-required blocks is layout only and isn't a "סעיף" the student
 * engaged with. Display-only groups that *are* sections still count.
 */
export function getCountedSections(exercise: Exercise): CountedSection[] {
  return getExerciseBlockGroups(exercise).flatMap((group, groupIndex) => {
    const answerBlocks = group.blocks.filter(isAnswerRequired)
    if (answerBlocks.length === 0 && group.sectionIndex === null) return []
    return [{ groupIndex, group, answerBlocks }]
  })
}

/** Stable response id for a counted section. */
export function sectionKey(exerciseId: string, groupIndex: number): string {
  return `${exerciseId}:${groupIndex}`
}
