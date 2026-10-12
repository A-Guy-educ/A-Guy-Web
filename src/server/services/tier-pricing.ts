/**
 * Tier pricing helpers (Web-only).
 *
 * Tier *application* (writing `currentTier` + `llmTokensLimit` to the user
 * doc) is owned by Admin via its PayPal webhook — see
 * `A-Guy-Admin/src/lib/payment/apply-tier-purchase.ts` and TIERS.md's
 * "LLM cost cap wiring" section. Web only owns the display + intro-pricing
 * eligibility read.
 *
 * @fileType service
 * @domain billing
 */

import { ObjectId } from 'mongodb'

import { getContentDb } from '@/infra/db/content-db'
import { type TierSlug } from '@/lib/tiers/constants'

/**
 * Count a user's prior succeeded tier-subscription purchases for a given
 * tier. Backs the intro-pricing eligibility check — fewer than `introMonths`
 * → the next checkout still gets the intro price. Keyed on buyer+tier so
 * each tier has its own intro budget.
 *
 * Reads the top-level `tierSlug` field on the transaction (added by the
 * Admin companion PR), not the old `metadata.tierSlug`.
 */
export async function countSucceededTierPurchases(userId: string, tier: TierSlug): Promise<number> {
  if (!ObjectId.isValid(userId)) return 0
  const db = await getContentDb()
  return db.collection('transactions').countDocuments({
    user: new ObjectId(userId),
    status: 'succeeded',
    tierSlug: tier,
  })
}
