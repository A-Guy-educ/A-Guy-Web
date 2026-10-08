/**
 * @fileType utility
 * @domain lessons
 * @ai-summary Task-5 eligibility check for the end-of-lesson focused review.
 *             A section qualifies when the student needed help getting
 *             through it — wrong answer, hint used on a 3-option retry,
 *             or AI validation skipped via self-compare (Task 7 quota
 *             fallback). Each lives in a different corner of the exercise-
 *             state bundle; this module centralizes the OR so the walker +
 *             tests + any future UI see the same definition.
 */

import type { Exercise } from '@/infra/types/content'
import type { ExerciseBlockGroup } from '@/infra/types/exercise'
import { readExerciseState } from '@/ui/web/exerciserenderer/utils/exerciseStateStorage'

/**
 * Block types that participate in the review-eligibility check. Non-question
 * blocks (rich_text, static svg, etc.) can't trigger a wrong/hint/notChecked
 * state so iterating them would just be wasted work.
 */
const CHECKED_BLOCK_TYPES = new Set([
  'question_select',
  'question_free_response',
  'question_table',
  'question_matching',
  'question_geometry',
  'question_axis',
])

/**
 * True when the student answered any block in the section wrong, used a hint,
 * or had AI validation skipped (self-compare fallback). Reads directly from
 * the shared exercise-state bundle so a mid-session refresh picks up the
 * same signals the walker will.
 *
 * Safe on SSR / fresh browsers (readExerciseState returns null) — the
 * function returns `false` and the walker proceeds to the normal lesson-
 * complete terminator.
 */
export function isSectionEligibleForReview(exercise: Exercise, group: ExerciseBlockGroup): boolean {
  const saved = readExerciseState(exercise.id)
  if (!saved) return false
  for (const block of group.blocks) {
    if (!CHECKED_BLOCK_TYPES.has(block.type)) continue
    const blockId = block.id
    // Wrong on the final check — covers both choice (true/false, mcq) and
    // free-response (Task 4 server verdict + local-match fallback).
    if (saved.checkResults[blockId]?.isCorrect === false) return true
    const meta = saved.blockMeta?.[blockId]
    if (!meta) continue
    // Any 3-option retry wrong attempt (Task 3) even if the final pick was
    // correct — the fact that they MISSED the first time means they'd
    // benefit from a second look.
    if ((meta.wrongOptionIds?.length ?? 0) > 0) return true
    // Hint was tapped on a 3-option retry (Task 3).
    if (meta.hintShown === true) return true
    // AI validation was skipped (Task 4 self-compare / Task 7 quota exhaustion).
    if (meta.notChecked === true) return true
  }
  return false
}
