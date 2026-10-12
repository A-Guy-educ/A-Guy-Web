/**
 * Content gating helpers per TIERS.md "Content gating rules".
 *
 * All inputs are 1-based sortOrder within the course (first lesson is 1,
 * first exercise is 1). When the kill switch is off, every gate returns
 * permissive — nothing is tier-locked.
 *
 * Rules (reduced form after rank comparison):
 *   learning lesson:    free locks nothing (exercise gate handles it); basic+ unlocks everything.
 *   learning exercise:  free unlocks first 3 exercises in lessons past #3; basic+ unlocks everything.
 *   practice lesson:    free unlocks first 3; basic+ unlocks everything.
 *   exam:               free + basic unlock first 3; advanced+ unlocks everything.
 *
 * @fileType helper
 * @domain billing
 */

import { TIER_RANK } from './constants'
import { isTierEnforcementEnabled } from './enforcement'
import { getUserTierRank, type UserWithTier } from './user-tier'

const FREE_UNLOCK_COUNT = 3

type User = UserWithTier | null | undefined

export function canAccessLearningLesson(_user: User, _lessonSortOrder: number): boolean {
  // Learning lessons are always visible to free; the exercise gate past #3
  // handles the lock. Kept as a function so callers can switch to a stricter
  // rule later without hunting every call site.
  return true
}

export function canAccessLearningExercise(
  user: User,
  lessonSortOrder: number,
  exerciseSortOrder: number,
): boolean {
  if (!isTierEnforcementEnabled()) return true
  if (getUserTierRank(user) >= TIER_RANK.basic) return true
  if (lessonSortOrder <= FREE_UNLOCK_COUNT) return true
  return exerciseSortOrder <= FREE_UNLOCK_COUNT
}

export function canAccessPracticeLesson(user: User, lessonSortOrder: number): boolean {
  if (!isTierEnforcementEnabled()) return true
  if (getUserTierRank(user) >= TIER_RANK.basic) return true
  return lessonSortOrder <= FREE_UNLOCK_COUNT
}

export function canAccessExam(user: User, examSortOrder: number): boolean {
  if (!isTierEnforcementEnabled()) return true
  if (getUserTierRank(user) >= TIER_RANK.advanced) return true
  return examSortOrder <= FREE_UNLOCK_COUNT
}
