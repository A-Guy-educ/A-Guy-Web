/**
 * Tier enforcement kill switches — one per restriction family, so token
 * spending caps and each kind of content lock can be turned on independently.
 *
 * 1. `TIER_SPENDING_LIMITS_ENABLED` — AI spending restrictions: daily/monthly
 *    LLM token caps (`checkTokenLimit`, `reconcileUserLlmLimit`), the per-tier
 *    daily AI-question quota (chat-quota, `getUserDailyAiQuota`) and the
 *    premium fair-use model downgrade. Every caller is server-side, so this
 *    is a plain (non-`NEXT_PUBLIC_`) var read at runtime — a Vercel env edit
 *    takes effect without a rebuild. Don't read it from client code: it
 *    resolves to `undefined` in the browser.
 *
 * 2. `NEXT_PUBLIC_TIER_LEARNING_LOCKS_ENABLED` — the learning-lesson exercise
 *    cap (`canAccessLearningExercise`): from the 4th opened learning lesson on,
 *    free users get only the first 3 exercises. Drives the ChatLessonRunnerView
 *    exercise clamp.
 *
 * 3. `NEXT_PUBLIC_TIER_PRACTICE_EXAM_LOCKS_ENABLED` — the practice-lesson and
 *    exam gates (`canAccessPracticeLesson`, `canAccessExam`): only the first 3
 *    opened of each are unlocked on the lower tiers.
 *
 * The content-lock switches (2, 3) must keep the `NEXT_PUBLIC_` prefix because
 * most of their gates run inside `'use client'` components. NEXT_PUBLIC_*
 * values are inlined at build time, so flipping them requires a redeploy — not
 * just a Vercel env edit. The opened-lessons ledger is fetched when either is
 * on (`isTierContentLocksEnabled`).
 *
 * All default OFF (permissive). Older combined switches are honoured as
 * fallbacks when a new var is unset, so existing deployments keep their
 * behaviour until the new vars are configured:
 *   - content locks fall back to `NEXT_PUBLIC_TIER_CONTENT_LOCKS_ENABLED`,
 *   - everything falls back to `NEXT_PUBLIC_TIER_ENFORCEMENT_ENABLED`.
 * An explicit new value (including `false`) overrides the fallbacks. Remove
 * them once every environment has been migrated.
 *
 * @fileType helper
 * @domain billing
 */

const TRUE_LITERALS = new Set(['1', 'true', 'on', 'yes'])

function parseFlag(raw: string | undefined): boolean {
  if (!raw) return false
  return TRUE_LITERALS.has(raw.trim().toLowerCase())
}

export function isTierSpendingLimitsEnabled(): boolean {
  return parseFlag(
    process.env.TIER_SPENDING_LIMITS_ENABLED || process.env.NEXT_PUBLIC_TIER_ENFORCEMENT_ENABLED,
  )
}

// Each `process.env.NEXT_PUBLIC_*` access below must stay a literal member
// expression so Next.js can inline it into the client bundle.

export function isTierLearningLocksEnabled(): boolean {
  return parseFlag(
    process.env.NEXT_PUBLIC_TIER_LEARNING_LOCKS_ENABLED ||
      process.env.NEXT_PUBLIC_TIER_CONTENT_LOCKS_ENABLED ||
      process.env.NEXT_PUBLIC_TIER_ENFORCEMENT_ENABLED,
  )
}

export function isTierPracticeExamLocksEnabled(): boolean {
  return parseFlag(
    process.env.NEXT_PUBLIC_TIER_PRACTICE_EXAM_LOCKS_ENABLED ||
      process.env.NEXT_PUBLIC_TIER_CONTENT_LOCKS_ENABLED ||
      process.env.NEXT_PUBLIC_TIER_ENFORCEMENT_ENABLED,
  )
}

/** True when any content lock is on — gates fetching the opened-lessons ledger. */
export function isTierContentLocksEnabled(): boolean {
  return isTierLearningLocksEnabled() || isTierPracticeExamLocksEnabled()
}
