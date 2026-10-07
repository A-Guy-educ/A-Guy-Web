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
 * Sizing (2026-10): free's daily chat quota is 10 req/day * 30 days *
 * ~3k tokens/turn ≈ 1M just for chat. 2M gives ~2x headroom for the
 * heavier ops (image-to-exercise, PDF, answer validation).
 */
export const TIER_LLM_TOKEN_CAP_MONTHLY: Record<TierSlug, number | null> = {
  free: 2_000_000,
  basic: 10_000_000,
  advanced: 30_000_000,
  premium: null,
}

export function isTierSlug(value: unknown): value is TierSlug {
  return typeof value === 'string' && (TIER_SLUGS as readonly string[]).includes(value)
}
