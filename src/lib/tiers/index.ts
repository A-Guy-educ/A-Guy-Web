/**
 * Public barrel for tier helpers — client-safe only.
 *
 * `llm-cost-cap.ts` is intentionally **not** re-exported here because it
 * imports `mongodb`, which breaks any client component that transitively
 * reaches the barrel. Server code wanting `reconcileUserLlmLimit` or
 * `tierLlmLimit` must import directly from `@/lib/tiers/llm-cost-cap`.
 *
 * @fileType barrel
 * @domain billing
 */

export {
  TIER_SLUGS,
  DEFAULT_TIER,
  TIER_RANK,
  TIER_LABEL_HE,
  TIER_LABEL_EN,
  TIER_PRICE_ILS,
  TIER_AI_COST_CAP_ILS,
  TIER_LLM_TOKEN_CAP_MONTHLY,
  isTierSlug,
  type TierSlug,
} from './constants'
export { isTierEnforcementEnabled } from './enforcement'
export { getUserTierSlug, getUserTierRank, userMeetsTier, type UserWithTier } from './user-tier'
export {
  canAccessLearningLesson,
  canAccessLearningExercise,
  canAccessPracticeLesson,
  canAccessExam,
} from './content-gates'
export { TIER_DAILY_AI_QUESTIONS, getUserDailyAiQuota } from './ai-quota'
export { selectGeminiModel } from './model-selection'
