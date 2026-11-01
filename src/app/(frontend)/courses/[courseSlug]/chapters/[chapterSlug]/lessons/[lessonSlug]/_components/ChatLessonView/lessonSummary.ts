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
import type { ContentBlock } from '@/infra/types/exercise'
import {
  classifySectionOutcome,
  getCountedSections,
  type AnswerBlockFacts,
} from '@/lib/exercises/sectionOutcome'
import { readExerciseState } from '@/ui/web/exerciserenderer/utils/exerciseStateStorage'

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
 * Facts for one answer-required block from the chat-native localStorage
 * bundle. `null` state = the exercise was never touched (skipped whole).
 */
function blockFactsFromStorage(
  saved: ReturnType<typeof readExerciseState>,
  block: ContentBlock,
): AnswerBlockFacts {
  const result = saved?.checkResults[block.id]
  const meta = saved?.blockMeta?.[block.id]
  return {
    answered: Boolean(result),
    finalCorrect: result?.isCorrect !== false,
    hadWrongAttempt: (meta?.wrongOptionIds?.length ?? 0) > 0,
    hintUsed: meta?.hintShown === true,
    explanationUsed: meta?.explanationShown === true,
    selfChecked: meta?.notChecked === true,
  }
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
    const sections = getCountedSections(exercise)
    if (sections.length === 0) continue
    const saved = readExerciseState(exercise.id)
    for (const { answerBlocks } of sections) {
      stats.totalSections += 1
      const outcome = classifySectionOutcome(
        answerBlocks.map((block) => blockFactsFromStorage(saved, block)),
      )
      switch (outcome) {
        case 'alone':
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
 *      on hints / explanations / notChecked / retry.
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
