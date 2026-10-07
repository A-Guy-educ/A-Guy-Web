/**
 * Gemini model selector with premium fair-use downgrade stub.
 *
 * All tiers start on the strongest Gemini model registered in
 * `PROVIDER_MODEL_NAMES` for the given task. Premium users are the only
 * group with no hard monthly cost cap — once a premium user crosses the
 * fair-use threshold (~50 req/month per TIERS.md), the model is swapped
 * to a cheaper variant instead of denying the request.
 *
 * Not implemented yet: the monthly per-user request counter + the
 * cheap-model fallback table. Shipping as a stub so callers can migrate
 * off `PROVIDER_MODEL_NAMES[GEMINI][key]` to `selectGeminiModel(user, key)`
 * now — when the downgrade logic lands we only touch this file.
 *
 * @fileType helper
 * @domain billing
 */

import { PROVIDER_MODEL_NAMES, type AIModelKey } from '@/infra/llm/models'
import { LLMProviderType } from '@/infra/llm/providers/types'
import { isTierEnforcementEnabled } from './enforcement'
import { getUserTierSlug, type UserWithTier } from './user-tier'

export function selectGeminiModel(
  user: UserWithTier | null | undefined,
  modelKey: AIModelKey,
): string {
  const topModel = PROVIDER_MODEL_NAMES[LLMProviderType.GEMINI][modelKey]
  if (!isTierEnforcementEnabled()) return topModel
  if (getUserTierSlug(user) !== 'premium') return topModel

  // TODO: premium fair-use downgrade.
  //   1. Count user's monthly LLM requests (new collection or $sum on `llm-usage`).
  //   2. If count > PREMIUM_FAIR_USE_SOFT_CAP (~50), return the cheaper
  //      Gemini variant for this modelKey (needs a GEMINI_CHEAP_FALLBACK map).
  //   3. If count > PREMIUM_FAIR_USE_HARD_CAP (~60), consider denying.
  // Owner: TIERS.md "Web implementation › Model selection".
  return topModel
}
