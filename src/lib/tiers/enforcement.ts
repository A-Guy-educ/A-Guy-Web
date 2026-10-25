/**
 * Tier enforcement kill switches — one per restriction family, so token
 * spending caps and content locks can be turned on independently.
 *
 * 1. `TIER_SPENDING_LIMITS_ENABLED` — AI spending restrictions: daily/monthly
 *    LLM token caps (`checkTokenLimit`, `reconcileUserLlmLimit`), the per-tier
 *    daily AI-question quota (chat-quota, `getUserDailyAiQuota`) and the
 *    premium fair-use model downgrade. Every caller is server-side, so this
 *    is a plain (non-`NEXT_PUBLIC_`) var read at runtime — a Vercel env edit
 *    takes effect without a rebuild. Don't read it from client code: it
 *    resolves to `undefined` in the browser.
 *
 * 2. `NEXT_PUBLIC_TIER_CONTENT_LOCKS_ENABLED` — tier content locks: lesson /
 *    exercise / exam gates (`content-gates.ts`), the opened-lessons ledger and
 *    the ChatLessonRunnerView exercise clamp. Must keep the `NEXT_PUBLIC_`
 *    prefix because most of these run inside `'use client'` components.
 *    NEXT_PUBLIC_* values are inlined at build time, so flipping it requires
 *    a redeploy — not just a Vercel env edit.
 *
 * Both default OFF (permissive). The legacy combined switch
 * `NEXT_PUBLIC_TIER_ENFORCEMENT_ENABLED` is still honoured as a fallback when
 * a new var is unset, so existing deployments keep their behaviour until the
 * new vars are configured. Remove the fallback once every environment has
 * been migrated.
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

export function isTierContentLocksEnabled(): boolean {
  // Each `process.env.NEXT_PUBLIC_*` access must stay a literal member
  // expression so Next.js can inline it into the client bundle.
  return parseFlag(
    process.env.NEXT_PUBLIC_TIER_CONTENT_LOCKS_ENABLED ||
      process.env.NEXT_PUBLIC_TIER_ENFORCEMENT_ENABLED,
  )
}
