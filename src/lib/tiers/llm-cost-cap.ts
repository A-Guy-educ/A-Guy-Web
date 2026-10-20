/**
 * LLM token cap seed — writes `users.llmTokensLimit` from tier when (and
 * only when) the user has never had one set.
 *
 * Admin owns `llmTokensLimit`: the User admin page exposes an editable
 * "LLM tokens limit" field, so a hand-tuned value for a specific user
 * must be respected. This helper therefore seeds-only — it writes iff
 * `llmTokensLimit` is null/missing. Admin values are never overwritten,
 * even if the user's tier changes later. (A tier change that should
 * also adjust the limit is an admin action, not an automatic one.)
 *
 * Short-circuits when the kill switch is off so admin-set values aren't
 * touched during the subscriptions-not-live phase either.
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
import { TIER_LLM_TOKEN_CAP_DAILY, TIER_LLM_TOKEN_CAP_MONTHLY } from './constants'
import { isTierEnforcementEnabled } from './enforcement'
import { getUserTierSlug, type UserWithTier } from './user-tier'

interface ReconcileArgs {
  userId: string
  user: UserWithTier & {
    llmTokensLimit?: number | null
    llmTokensDailyLimit?: number | null
  }
}

export function tierLlmLimit(user: UserWithTier | null | undefined): number | null {
  return TIER_LLM_TOKEN_CAP_MONTHLY[getUserTierSlug(user)]
}

export function tierLlmLimitDaily(user: UserWithTier | null | undefined): number | null {
  return TIER_LLM_TOKEN_CAP_DAILY[getUserTierSlug(user)]
}

export async function reconcileUserLlmLimit({ userId, user }: ReconcileArgs): Promise<void> {
  if (!isTierEnforcementEnabled()) return
  if (!ObjectId.isValid(userId)) return

  // Seed only — never overwrite an existing (admin-set) value. Monthly and
  // daily are seeded independently so an admin can set one without the other
  // being auto-filled next request.
  //
  // The daily predicate checks for `undefined` only (not "non-number") so an
  // admin's explicit `null` — meaning "no daily cap for this user, override
  // the tier default" — survives the next seed pass. Monthly keeps the
  // historical typeof-number check for backwards compatibility with the
  // existing Admin UI, which doesn't expose a null option on that field.
  const toSet: Record<string, number> = {}
  if (typeof user.llmTokensLimit !== 'number') {
    const monthly = tierLlmLimit(user)
    if (monthly !== null) toSet.llmTokensLimit = monthly
  }
  if (user.llmTokensDailyLimit === undefined) {
    const daily = tierLlmLimitDaily(user)
    if (daily !== null) toSet.llmTokensDailyLimit = daily
  }
  if (Object.keys(toSet).length === 0) return

  try {
    const db = await getContentDb()
    await db.collection('users').updateOne({ _id: new ObjectId(userId) }, { $set: toSet })
  } catch (err) {
    logger.warn({ err, userId }, 'reconcileUserLlmLimit failed — swallowed')
  }
}
