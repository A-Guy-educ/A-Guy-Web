/**
 * Tier enforcement kill switch.
 *
 * Reads `NEXT_PUBLIC_TIER_ENFORCEMENT_ENABLED` from env. When off (default),
 * every gate helper in this folder short-circuits to permissive — no content
 * is locked by tier, no AI cost cap is applied, no daily quota is enforced,
 * no premium downgrade kicks in.
 *
 * Must use the `NEXT_PUBLIC_` prefix because most tier gates run inside
 * `'use client'` components (lesson/exam row lists, ExercisesPager lock card,
 * ChatLessonRunnerView clamp). Non-prefixed env vars are stripped from the
 * client bundle at build time, so a server-only name silently resolves to
 * `undefined` in the browser and every gate stays permissive. Server-side
 * callers (chat-quota, checkTokenLimit, login reconciler) read the same
 * variable at runtime from Node, so a single prefixed name works for both.
 *
 * The default is OFF because we don't expect subscriptions yet; flip it on
 * when we open paid tiers to real traffic. Note: NEXT_PUBLIC_* changes are
 * inlined at build time, so flipping the var requires a redeploy — not just
 * a Vercel env edit.
 *
 * @fileType helper
 * @domain billing
 */

const TRUE_LITERALS = new Set(['1', 'true', 'on', 'yes'])

export function isTierEnforcementEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_TIER_ENFORCEMENT_ENABLED
  if (!raw) return false
  return TRUE_LITERALS.has(raw.trim().toLowerCase())
}
