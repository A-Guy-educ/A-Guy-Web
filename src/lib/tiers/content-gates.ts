/**
 * Content gating helpers per TIERS.md "Content gating rules".
 *
 * Lesson-level gates count the **distinct lessons the user has opened**, per
 * lesson type, not the lesson's position in the course: a free user can open
 * lessons 3, 17 and 29 and hits the paywall on the 4th distinct one. The
 * opened lists come from `user-progresses` (server-side, see
 * `@/server/services/tier-lesson-access`) and are passed in as plain data so
 * these helpers stay pure and client-safe. When the kill switch is off, every
 * gate returns permissive — nothing is tier-locked.
 *
 * Rules (reduced form after rank comparison):
 *   learning lesson:    always opens; the first 3 opened are fully open, the
 *                       rest are capped by the exercise gate. basic+ unlocks everything.
 *   learning exercise:  free unlocks the first 3 exercises in a learning lesson
 *                       outside the user's first 3 opened; basic+ unlocks everything.
 *   practice lesson:    free unlocks the first 3 opened; basic+ unlocks everything.
 *   exam:               free + basic unlock the first 3 opened; advanced+ unlocks everything.
 *
 * @fileType helper
 * @domain billing
 */

import { TIER_RANK } from './constants'
import { isTierEnforcementEnabled } from './enforcement'
import { getUserTierRank, type UserWithTier } from './user-tier'

const FREE_UNLOCK_COUNT = 3

type User = UserWithTier | null | undefined

/** Lesson ids the user has opened, per lesson type, in first-opened order. */
export type OpenedLessonIds = {
  learning: string[]
  practice: string[]
  exam: string[]
}

export const EMPTY_OPENED_LESSONS: OpenedLessonIds = { learning: [], practice: [], exam: [] }

function isWithinOpenedAllowance(lessonId: string, opened: readonly string[]): boolean {
  return opened.includes(lessonId) || opened.length < FREE_UNLOCK_COUNT
}

export function canAccessLearningLesson(_user: User, _lessonId: string): boolean {
  // Learning lessons always open for free; the exercise gate handles the cap.
  // Kept as a function so callers can switch to a stricter rule later without
  // hunting every call site.
  return true
}

/**
 * 1-based position of a learning lesson in the user's opened order — the
 * `lessonOpenOrdinal` fed to `canAccessLearningExercise`. A lesson not opened
 * yet takes the next slot (it is recorded on this visit).
 */
export function getLearningLessonOpenOrdinal(
  lessonId: string,
  openedLearning: readonly string[],
): number {
  const idx = openedLearning.indexOf(lessonId)
  return idx >= 0 ? idx + 1 : openedLearning.length + 1
}

export function canAccessLearningExercise(
  user: User,
  lessonOpenOrdinal: number,
  exerciseSortOrder: number,
): boolean {
  if (!isTierEnforcementEnabled()) return true
  if (getUserTierRank(user) >= TIER_RANK.basic) return true
  if (lessonOpenOrdinal <= FREE_UNLOCK_COUNT) return true
  return exerciseSortOrder <= FREE_UNLOCK_COUNT
}

export function canAccessPracticeLesson(
  user: User,
  lessonId: string,
  openedPractice: readonly string[],
): boolean {
  if (!isTierEnforcementEnabled()) return true
  if (getUserTierRank(user) >= TIER_RANK.basic) return true
  return isWithinOpenedAllowance(lessonId, openedPractice)
}

export function canAccessExam(
  user: User,
  lessonId: string,
  openedExams: readonly string[],
): boolean {
  if (!isTierEnforcementEnabled()) return true
  if (getUserTierRank(user) >= TIER_RANK.advanced) return true
  return isWithinOpenedAllowance(lessonId, openedExams)
}
