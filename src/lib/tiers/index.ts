/**
 * Public barrel for tier helpers.
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
export { tierLlmLimit, reconcileUserLlmLimit } from './llm-cost-cap'
export { selectGeminiModel } from './model-selection'
