/**
 * Per-tier daily AI-question quota.
 *
 * Numbers are Web-side decisions, surfaced in TIERS.md "Web implementation".
 * `null` = no hard daily cap (premium → fair use, see model-selection.ts
 * for soft-cap downgrade).
 *
 * When the kill switch is off, `getUserDailyAiQuota` returns `null`
 * (unlimited) for every tier.
 *
 * @fileType helper
 * @domain billing
 */

import type { TierSlug } from './constants'
import { isTierEnforcementEnabled } from './enforcement'
import { getUserTierSlug, type UserWithTier } from './user-tier'

export const TIER_DAILY_AI_QUESTIONS: Record<TierSlug, number | null> = {
  free: 10,
  basic: 50,
  advanced: 150,
  premium: null,
}

export function getUserDailyAiQuota(user: UserWithTier | null | undefined): number | null {
  if (!isTierEnforcementEnabled()) return null
  return TIER_DAILY_AI_QUESTIONS[getUserTierSlug(user)]
}
