/**
 * @fileType utility
 * @domain lessons
 * @ai-summary Lesson-end summary stats + outcome classification for the Chat
 *             view's post-lesson card. Reads the per-exercise state bundle
 *             the chat-native path writes (same `exerciseStateStorage`
 *             helpers used by Tasks 3/4 for retry + free-response history)
 *             and distills a lesson into one of five pedagogical outcomes
 *             with per-section counts the card renders.
 */

import type { Exercise } from '@/infra/types/content'
import type { ExerciseBlockGroup } from '@/infra/types/exercise'
import { getExerciseBlockGroups } from '@/lib/exercises/getExerciseBlocks'
import { readExerciseState } from '@/ui/web/exerciserenderer/utils/exerciseStateStorage'
import { isAnswerRequired } from './useExerciseWalker'

/**
 * Section-level outcome. Mirrors the four buckets in the summary mockup's
 * breakdown row: "נכון ללא עזרה / נכון עם רמז או הסבר / דילגת / הסתיימו בטעות".
 */
export type SectionOutcomeKind = 'alone-correct' | 'with-help' | 'skipped' | 'wrong'

export interface LessonStats {
  totalSections: number
  alone: number
  withHelp: number
  skipped: number
  wrong: number
}

/**
 * Priority-ordered outcome bucket for the summary card title + assessment
 * copy. Highest-signal wins — a lesson with 50% skips is "many-skips" even
 * if the attempted half was fine, because that's the signal the pedagogy
 * callouts need to speak to.
 */
export type LessonOutcome =
  'high-independent' | 'good-with-difficulty' | 'lots-of-help' | 'many-mistakes' | 'many-skips'

/**
 * Reduce one section (one ExerciseBlockGroup) into a single outcome kind by
 * inspecting its answer-required blocks. If any block is wrong, the whole
 * section is wrong. If none were submitted, skipped. Otherwise help-usage
 * (hint / retry wrong / notChecked) demotes the section from alone to with-help.
 */
function classifySection(exerciseId: string, group: ExerciseBlockGroup): SectionOutcomeKind {
  const answerBlocks = group.blocks.filter(isAnswerRequired)
  if (answerBlocks.length === 0) return 'alone-correct' // intro-only groups don't drag down counts
  const saved = readExerciseState(exerciseId)
  if (!saved) return 'skipped'
  let anyWrong = false
  let anyAnswered = false
  let anyHelp = false
  for (const block of answerBlocks) {
    const result = saved.checkResults[block.id]
    const meta = saved.blockMeta?.[block.id]
    if (result) anyAnswered = true
    if (result?.isCorrect === false) anyWrong = true
    // Help usage covers all three Task-2/3/4/7 signals: retry miss, hint
    // tapped, or AI validation skipped via self-compare.
    if (
      (meta?.wrongOptionIds?.length ?? 0) > 0 ||
      meta?.hintShown === true ||
      meta?.notChecked === true
    ) {
      anyHelp = true
    }
  }
  if (anyWrong) return 'wrong'
  if (!anyAnswered) return 'skipped'
  return anyHelp ? 'with-help' : 'alone-correct'
}

/**
 * Walk every section of every exercise in the lesson and aggregate the
 * section-level outcomes into the breakdown the summary card needs.
 */
export function computeLessonStats(exercises: Exercise[]): LessonStats {
  const stats: LessonStats = {
    totalSections: 0,
    alone: 0,
    withHelp: 0,
    skipped: 0,
    wrong: 0,
  }
  for (const exercise of exercises) {
    const groups = getExerciseBlockGroups(exercise)
    for (const group of groups) {
      // Mirror the walker's filter: skip top-level groups that are display-
      // only and only kept for layout. If the group has no answer-required
      // blocks and the exercise has sections, the group doesn't count as a
      // "סעיף" the student engaged with.
      const answerBlocks = group.blocks.filter(isAnswerRequired)
      if (answerBlocks.length === 0 && group.sectionIndex === null) continue
      stats.totalSections += 1
      const outcome = classifySection(exercise.id, group)
      switch (outcome) {
        case 'alone-correct':
          stats.alone += 1
          break
        case 'with-help':
          stats.withHelp += 1
          break
        case 'skipped':
          stats.skipped += 1
          break
        case 'wrong':
          stats.wrong += 1
          break
      }
    }
  }
  return stats
}

/**
 * Pedagogical outcome bucket. Priority (highest-signal first):
 *   1. 50%+ skipped → the student bailed on half or more → `many-skips`,
 *      regardless of how the attempted half went. Skipping dominates.
 *   2. 30%+ wrong → `many-mistakes` — the topic needs reinforcement.
 *   3. 40%+ with-help → `lots-of-help` — the student got there but leaned
 *      on hints / notChecked / retry.
 *   4. 85%+ alone → `high-independent` — clean run.
 *   5. Default → `good-with-difficulty`.
 *
 * Thresholds pulled from the summary-card mockup's five canonical cases.
 * Short of a total of zero (empty lesson) the classifier is total.
 */
export function classifyLessonOutcome(stats: LessonStats): LessonOutcome {
  const total = stats.totalSections
  if (total === 0) return 'good-with-difficulty'
  const skippedPct = stats.skipped / total
  const wrongPct = stats.wrong / total
  const helpPct = stats.withHelp / total
  const alonePct = stats.alone / total
  if (skippedPct >= 0.5) return 'many-skips'
  if (wrongPct >= 0.3) return 'many-mistakes'
  if (helpPct >= 0.4) return 'lots-of-help'
  if (alonePct >= 0.85) return 'high-independent'
  return 'good-with-difficulty'
}

/**
 * Human-readable "mm:ss" duration string. The chat-view spec talks in
 * "minutes of active learning" so the summary card shows mm:ss with the
 * minutes component bolded upstream.
 */
export function formatElapsed(elapsedMs: number): { minutes: number; seconds: number } {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  }
}

/**
 * ILS saved vs. a reference private-lesson price (180₪ per the mockup's
 * assumption). Non-free tiers subtract their monthly subscription from the
 * reference. Negative deltas (premium tier is more than one private lesson)
 * clamp to 0 so the card doesn't say "חסכת -X ₪".
 */
export const PRIVATE_LESSON_PRICE_ILS = 180

export function computeMoneySaved(tierPrice: number): number {
  return Math.max(0, PRIVATE_LESSON_PRICE_ILS - tierPrice)
}
