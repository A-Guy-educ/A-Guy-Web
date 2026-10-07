/**
 * LLM cost cap reconciler — writes `users.llmTokensLimit` from tier.
 *
 * Admin disabled all automatic tier-recompute hooks; an admin sets
 * `currentTier` manually. Web gets no notification, so we reconcile
 * lazily: call this on login or in `/api/users/me` and it will no-op
 * when the limit already matches the tier's cap.
 *
 * `TIER_AI_COST_CAP_ILS` is in ILS and `llmTokensLimit` is in tokens —
 * the two aren't the same unit. The Admin schema stores the token cap
 * directly today; until the Admin side wires a cost→token conversion,
 * we treat the ILS value as the raw cap integer the User doc already
 * expects (both apps agree on the integer; Admin owns the semantics).
 * premium → null (no hard cap, fair use only).
 *
 * When the kill switch is off this helper writes `null` so no limit
 * is enforced regardless of tier.
 *
 * Writes go through the raw Mongo driver because Payload's
 * `access.update` is `() => false` on the token fields (see
 * server/services/llm-usage.ts header).
 *
 * @fileType service
 * @domain llm
 */

import { ObjectId } from 'mongodb'
import { getContentDb } from '@/infra/db/content-db'
import { logger } from '@/infra/utils/logger/logger'
import { TIER_AI_COST_CAP_ILS } from './constants'
import { isTierEnforcementEnabled } from './enforcement'
import { getUserTierSlug, type UserWithTier } from './user-tier'

interface ReconcileArgs {
  userId: string
  user: UserWithTier & { llmTokensLimit?: number | null }
}

export function tierLlmLimit(user: UserWithTier | null | undefined): number | null {
  return TIER_AI_COST_CAP_ILS[getUserTierSlug(user)]
}

export async function reconcileUserLlmLimit({ userId, user }: ReconcileArgs): Promise<void> {
  // Kill switch — leave any existing admin-set `llmTokensLimit` alone when
  // enforcement is off. `checkTokenLimit` ignores it anyway, and we don't
  // want to clobber data an admin may have hand-tuned during the off period.
  if (!isTierEnforcementEnabled()) return
  if (!ObjectId.isValid(userId)) return
  const target = tierLlmLimit(user)
  const current = typeof user.llmTokensLimit === 'number' ? user.llmTokensLimit : null
  if (current === target) return

  try {
    const db = await getContentDb()
    await db
      .collection('users')
      .updateOne({ _id: new ObjectId(userId) }, { $set: { llmTokensLimit: target } })
  } catch (err) {
    logger.warn({ err, userId }, 'reconcileUserLlmLimit failed — swallowed')
  }
}
