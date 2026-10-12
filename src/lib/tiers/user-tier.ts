/**
 * Resolve a user's effective tier.
 *
 * Null / missing / invalid `currentTier` falls back to `DEFAULT_TIER`
 * ('free'). The admin backfill script sets every existing user to a
 * real slug, but these helpers stay defensive — the generated User
 * type doesn't yet carry `currentTier`, so callers hand us a
 * structural `{ currentTier?: string | null }` shape.
 *
 * @fileType helper
 * @domain billing
 */

import { DEFAULT_TIER, isTierSlug, TIER_RANK, type TierSlug } from './constants'

export interface UserWithTier {
  currentTier?: string | null
}

export function getUserTierSlug(user: UserWithTier | null | undefined): TierSlug {
  if (!user || !isTierSlug(user.currentTier)) return DEFAULT_TIER
  return user.currentTier
}

export function getUserTierRank(user: UserWithTier | null | undefined): number {
  return TIER_RANK[getUserTierSlug(user)]
}

export function userMeetsTier(
  user: UserWithTier | null | undefined,
  requiredTier: TierSlug,
): boolean {
  return getUserTierRank(user) >= TIER_RANK[requiredTier]
}
