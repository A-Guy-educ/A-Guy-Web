/**
 * Apply a paid tier to a user after a successful subscription checkout.
 *
 * Writes directly to the raw `users` collection because Payload's
 * `access.update` locks the tier + token fields down to admin-only — the
 * webhook has no admin session, so it bypasses Payload the same way
 * `reconcileUserLlmLimit` does.
 *
 * The webhook that calls this is already idempotent (via
 * `claimTransactionSucceeded`), so this helper doesn't need its own guard.
 *
 * @fileType service
 * @domain billing
 */

import { ObjectId } from 'mongodb'

import { getContentDb } from '@/infra/db/content-db'
import { TIER_LLM_TOKEN_CAP_MONTHLY, type TierSlug } from '@/lib/tiers/constants'

export async function applyUserTier(userId: string, tier: TierSlug): Promise<void> {
  if (!ObjectId.isValid(userId)) {
    throw new Error(`applyUserTier: invalid userId "${userId}"`)
  }

  const db = await getContentDb()
  const now = new Date()
  const tokenLimit = TIER_LLM_TOKEN_CAP_MONTHLY[tier]
  // `llmTokensResetAt` is the END of the active window (bumpUserCounter in
  // llm-usage.ts stamps it as the first moment of next month). An upgrade
  // resets usage, so stamp a fresh month-end here too.
  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        currentTier: tier,
        // null for premium (fair-use, no hard cap) — mirrors the schema.
        llmTokensLimit: tokenLimit,
        llmTokensUsed: 0,
        llmTokensResetAt: nextReset,
        updatedAt: now,
      },
    },
  )
}

/**
 * Count a user's prior succeeded tier-subscription purchases for a given
 * tier. Backs the intro-pricing eligibility check — fewer than `introMonths`
 * → the next checkout still gets the intro price. Keyed on buyer+tier so
 * each tier has its own intro budget.
 */
export async function countSucceededTierPurchases(userId: string, tier: TierSlug): Promise<number> {
  if (!ObjectId.isValid(userId)) return 0
  const db = await getContentDb()
  return db.collection('transactions').countDocuments({
    user: new ObjectId(userId),
    status: 'succeeded',
    'metadata.purchaseType': 'tier_subscription',
    'metadata.tierSlug': tier,
  })
}
