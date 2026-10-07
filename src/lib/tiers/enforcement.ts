/**
 * Tier enforcement kill switch.
 *
 * Reads `TIER_ENFORCEMENT_ENABLED` from env. When off (default), every
 * gate helper in this folder short-circuits to permissive — no content
 * is locked by tier, no AI cost cap is applied, no daily quota is
 * enforced, no premium downgrade kicks in.
 *
 * The default is OFF because we don't expect subscriptions yet; flip it
 * on when we open paid tiers to real traffic. Promoting to a DB-backed
 * Config flag later only requires changing this one function.
 *
 * @fileType helper
 * @domain billing
 */

const TRUE_LITERALS = new Set(['1', 'true', 'on', 'yes'])

export function isTierEnforcementEnabled(): boolean {
  const raw = process.env.TIER_ENFORCEMENT_ENABLED
  if (!raw) return false
  return TRUE_LITERALS.has(raw.trim().toLowerCase())
}
