/**
 * Tier constants — hardcoded enum.
 *
 * Source of truth: ../../../../TIERS.md (parent-folder shared doc).
 * Mirror of A-Guy-Admin/src/lib/tiers/constants.ts — values must stay
 * byte-identical. If a tier is renamed or added, update TIERS.md and
 * the Admin file first, then this one.
 *
 * @fileType constants
 * @domain billing
 */

export const TIER_SLUGS = ['free', 'basic', 'advanced', 'premium'] as const

export type TierSlug = (typeof TIER_SLUGS)[number]

export const DEFAULT_TIER: TierSlug = 'free'

export const TIER_RANK: Record<TierSlug, number> = {
  free: 0,
  basic: 1,
  advanced: 2,
  premium: 3,
}

export const TIER_LABEL_HE: Record<TierSlug, string> = {
  free: 'חינם',
  basic: 'בסיס',
  advanced: 'מתקדם',
  premium: 'פרימיום',
}

export const TIER_LABEL_EN: Record<TierSlug, string> = {
  free: 'Free',
  basic: 'Basic',
  advanced: 'Advanced',
  premium: 'Premium',
}

export const TIER_PRICE_ILS: Record<TierSlug, number> = {
  free: 0,
  basic: 59,
  advanced: 119,
  premium: 239,
}

/**
 * Monthly internal AI cost cap (ILS). `null` = no hard cap (fair-use only).
 * Admin-facing / display semantic — the number of shekels we're willing to
 * spend on a user per month. Not consumed by any gating code; see
 * `TIER_LLM_TOKEN_CAP_MONTHLY` below for the value Web actually enforces.
 */
export const TIER_AI_COST_CAP_ILS: Record<TierSlug, number | null> = {
  free: 1,
  basic: 10,
  advanced: 20,
  premium: null,
}

/**
 * Monthly token cap written to `users.llmTokensLimit` and compared against
 * `users.llmTokensUsed` by `checkTokenLimit`. `null` = no cap (premium
 * fair-use; downgrade logic handles abuse). Web-only — Admin owns the
 * ILS display semantic above, Web owns token enforcement.
 *
 * Derived from `TIER_AI_COST_CAP_ILS` × tokens-per-shekel at Gemini 2.5
 * Flash pricing (the model carrying the chat workload):
 *   Input:  $0.075 / 1M tokens
 *   Output: $0.30  / 1M tokens
 *   Blended ~$0.165/M at a ~60/40 input/output split
 *   $1 ≈ 3.7 NIS → 1 NIS ≈ 1.6M tokens (rounded to 1.5M for a safety margin)
 *
 * If we start routing more traffic to 2.5-pro or 3.1-pro the real $/token
 * climbs ~8× and these caps become too generous — revisit then.
 */
export const TIER_LLM_TOKEN_CAP_MONTHLY: Record<TierSlug, number | null> = {
  free: 1_500_000,
  basic: 15_000_000,
  advanced: 30_000_000,
  premium: null,
}

export function isTierSlug(value: unknown): value is TierSlug {
  return typeof value === 'string' && (TIER_SLUGS as readonly string[]).includes(value)
}
