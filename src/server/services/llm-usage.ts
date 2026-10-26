/**
 * LLM token usage accounting.
 *
 * Two write paths per LLM call:
 *   1. A row in `llm-usage` (event log) so dashboard aggregations can slice
 *      by any time window and by lessonId (unlocks top-lessons-by-tokens
 *      + today/month/year totals).
 *   2. `$inc users.llmTokensUsed` AND `$inc users.llmTokensUsedToday` for the
 *      per-user counters that drive rate limiting. Monthly resets on the
 *      first increment after `llmTokensResetAt`; daily resets on the first
 *      increment after `llmTokensDailyResetAt`. Both windows are enforced
 *      against their respective caps so a bad day can't eat the month.
 *
 * The user-side monthly fields (`llmTokensUsed`, `llmTokensLimit`,
 * `llmTokensResetAt`) are declared in the A-Guy-Admin Payload user schema
 * (PR #337). Daily counterparts (`llmTokensUsedToday`, `llmTokensDailyLimit`,
 * `llmTokensDailyResetAt`) also need to be declared in Admin before this
 * Web code can read / write through Payload — Admin PR pending. Payload's
 * `access.create` / `access.update` are `() => false` on these fields, so
 * any Payload write path is a no-op — Web must always write via the raw
 * driver, mirroring the existing chat-quota pattern.
 *
 * @fileType service
 * @domain llm
 * @pattern counter-collection + user-schema-counter
 * @ai-summary Per-call token event log + per-user daily+monthly counters with rate-limit check
 */

import { ObjectId, type Collection, type Document } from 'mongodb'

import { getContentDb } from '@/infra/db/content-db'
import { isTierSpendingLimitsEnabled } from '@/lib/tiers/enforcement'
import { logger } from '@/infra/utils/logger/logger'

const USAGE_COLLECTION = 'llm-usage'
const USERS_COLLECTION = 'users'

export type LlmCallType = 'chat' | 'chat_stream' | 'embedding' | 'lesson_variation' | 'other'

export interface RecordLlmUsageInput {
  userId: string
  lessonId?: string | null
  inputTokens: number
  outputTokens: number
  model?: string
  callType?: LlmCallType
  /** Attachments (e.g. the lesson PDF) the model should have seen but didn't. */
  attachmentsMissing?: number
}

export interface TokenLimitStatus {
  withinLimit: boolean
  used: number
  limit: number | null
  resetAt: string | null
  /**
   * Which window tripped the cap when `withinLimit` is false. `null` when the
   * user is within both limits. Lets the caller surface the right message
   * ("daily limit reached, resets tonight" vs. "monthly limit reached").
   */
  exceededWindow: 'daily' | 'monthly' | null
  daily: {
    used: number
    limit: number | null
    resetAt: string | null
  }
}

let indexPromise: Promise<void> | null = null

async function ensureUsageIndexes(): Promise<void> {
  indexPromise ??= (async () => {
    const db = await getContentDb()
    try {
      const c = db.collection(USAGE_COLLECTION)
      // createdAt for time-window aggregations (today/month/year totals).
      await c.createIndex({ createdAt: -1 }, { name: 'llm_usage_created_at_desc' })
      // Compound for "top lessons by tokens" — group by lessonId first.
      await c.createIndex({ lessonId: 1, createdAt: -1 }, { name: 'llm_usage_lesson_created_at' })
      // Compound for per-user drill-downs.
      await c.createIndex({ userId: 1, createdAt: -1 }, { name: 'llm_usage_user_created_at' })
      // Backs the dashboard top-users query — filters by active window and
      // sorts by usage desc. Payload doesn't manage this field so we
      // create it here (additive; Payload will leave it alone).
      await db
        .collection(USERS_COLLECTION)
        .createIndex(
          { llmTokensResetAt: 1, llmTokensUsed: -1 },
          { name: 'users_llm_tokens_active_desc' },
        )
      // Daily-window counterpart — same shape as the monthly index above.
      // Powers "top users today" dashboard slices and keeps the daily cap
      // check from scanning the users collection.
      await db
        .collection(USERS_COLLECTION)
        .createIndex(
          { llmTokensDailyResetAt: 1, llmTokensUsedToday: -1 },
          { name: 'users_llm_tokens_daily_active_desc' },
        )
    } catch (err) {
      indexPromise = null
      logger.warn({ err }, 'Failed to ensure llm-usage indexes')
    }
  })()
  return indexPromise
}

/** First moment of the *next* calendar month at server-local time. */
function startOfNextCalendarMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

/** First moment of the *next* calendar day at server-local time. */
function startOfNextCalendarDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
}

async function usersCollection(): Promise<Collection<Document>> {
  const db = await getContentDb()
  return db.collection(USERS_COLLECTION)
}

/**
 * Three-branch atomic counter bump — same pattern as chat-quota, applied
 * independently per window. If the stored reset is in the past (or missing),
 * reset to just the incoming delta and stamp a new reset. Otherwise `$inc`
 * onto the existing counter. Branch 3 catches a concurrent reset landing
 * between branches 1 and 2 so tokens are never silently dropped.
 */
async function bumpWindow(
  users: Collection<Document>,
  _id: ObjectId,
  delta: number,
  now: Date,
  fields: { usedField: string; resetField: string },
  nextReset: Date,
): Promise<void> {
  const { usedField, resetField } = fields

  // Branch 1: existing window is still valid — plain $inc.
  const bumped = await users.findOneAndUpdate(
    { _id, [resetField]: { $gt: now } },
    { $inc: { [usedField]: delta } },
    { returnDocument: 'after' },
  )
  if (bumped) return

  // Branch 2: window expired OR field missing — reset counter + stamp
  // next reset. The `$or` matches all "no valid window" states because
  // Mongo range operators are type-bracketed and won't match a missing
  // field via `$lte`.
  const reset = await users.updateOne(
    {
      _id,
      $or: [
        { [resetField]: { $lte: now } },
        { [resetField]: null },
        { [resetField]: { $exists: false } },
      ],
    },
    { $set: { [usedField]: delta, [resetField]: nextReset } },
  )
  if (reset.matchedCount > 0) return

  // Branch 3: a concurrent call already stamped a valid window between
  // branches 1 and 2 — apply the delta as a plain $inc so no tokens are
  // silently dropped in that race window.
  await users.updateOne({ _id, [resetField]: { $gt: now } }, { $inc: { [usedField]: delta } })
}

/**
 * Bump both the monthly and daily counters. Each window is tracked
 * independently so day-of-month boundary crossings don't desync them.
 */
async function bumpUserCounter(userId: string, delta: number): Promise<void> {
  if (!ObjectId.isValid(userId) || delta <= 0) return
  const users = await usersCollection()
  const _id = new ObjectId(userId)
  const now = new Date()

  await bumpWindow(
    users,
    _id,
    delta,
    now,
    { usedField: 'llmTokensUsed', resetField: 'llmTokensResetAt' },
    startOfNextCalendarMonth(now),
  )
  await bumpWindow(
    users,
    _id,
    delta,
    now,
    { usedField: 'llmTokensUsedToday', resetField: 'llmTokensDailyResetAt' },
    startOfNextCalendarDay(now),
  )
}

/**
 * Record one LLM call. Fire-and-forget-safe at the call site — errors are
 * logged but swallowed so a tracking failure never breaks the chat reply.
 */
export async function recordLlmUsage(input: RecordLlmUsageInput): Promise<void> {
  const totalTokens = Math.max(0, Math.floor(input.inputTokens + input.outputTokens))
  if (totalTokens <= 0) return
  if (!ObjectId.isValid(input.userId)) return

  try {
    await ensureUsageIndexes()
    const db = await getContentDb()
    const now = new Date()
    await db.collection(USAGE_COLLECTION).insertOne({
      userId: input.userId,
      lessonId: input.lessonId ?? null,
      inputTokens: Math.max(0, Math.floor(input.inputTokens)),
      outputTokens: Math.max(0, Math.floor(input.outputTokens)),
      totalTokens,
      model: input.model ?? null,
      callType: input.callType ?? 'other',
      ...(input.attachmentsMissing ? { attachmentsMissing: input.attachmentsMissing } : {}),
      createdAt: now,
    })
    await bumpUserCounter(input.userId, totalTokens)
  } catch (err) {
    logger.warn({ err, userId: input.userId }, 'recordLlmUsage failed — swallowed')
  }
}

interface WindowSnapshot {
  used: number
  limit: number | null
  resetAt: string | null
  withinLimit: boolean
}

/**
 * Project a single counter window from the raw user doc. Expired windows
 * are treated as `used: 0` so a user isn't blocked on their first call of
 * a new window — `bumpUserCounter` handles the actual reset write.
 */
function readWindow(
  doc: Document | null,
  now: Date,
  usedField: string,
  limitField: string,
  resetField: string,
): WindowSnapshot {
  const resetAt: Date | null = doc?.[resetField] ? new Date(doc[resetField]) : null
  const windowExpired = !resetAt || resetAt <= now
  const rawLimit =
    typeof doc?.[limitField] === 'number' && doc[limitField] > 0
      ? (doc[limitField] as number)
      : null
  const used = windowExpired ? 0 : Number(doc?.[usedField] ?? 0)
  return {
    used,
    limit: rawLimit,
    resetAt: resetAt && !windowExpired ? resetAt.toISOString() : null,
    withinLimit: rawLimit === null || used < rawLimit,
  }
}

/**
 * Read-only limit check. Called before the LLM invocation so the route
 * can 429 before spending on the model. `withinLimit: true` only when BOTH
 * the monthly and daily windows are under their respective caps.
 *
 * When a cap trips, `exceededWindow` names which one so the caller can
 * surface the right reset time ("resets tomorrow" vs. "resets next month").
 * Daily is checked first so it wins ties — the user hits the daily wall
 * long before the monthly wall in normal usage.
 */
export async function checkTokenLimit(userId: string): Promise<TokenLimitStatus> {
  // Kill switch — spending limits off means no cost cap for anyone.
  if (!isTierSpendingLimitsEnabled()) {
    return {
      withinLimit: true,
      used: 0,
      limit: null,
      resetAt: null,
      exceededWindow: null,
      daily: { used: 0, limit: null, resetAt: null },
    }
  }
  if (!ObjectId.isValid(userId)) {
    return {
      withinLimit: false,
      used: 0,
      limit: null,
      resetAt: null,
      exceededWindow: 'monthly',
      daily: { used: 0, limit: null, resetAt: null },
    }
  }
  const users = await usersCollection()
  const user = await users.findOne(
    { _id: new ObjectId(userId) },
    {
      projection: {
        llmTokensUsed: 1,
        llmTokensLimit: 1,
        llmTokensResetAt: 1,
        llmTokensUsedToday: 1,
        llmTokensDailyLimit: 1,
        llmTokensDailyResetAt: 1,
      },
    },
  )
  const now = new Date()
  const monthly = readWindow(user, now, 'llmTokensUsed', 'llmTokensLimit', 'llmTokensResetAt')
  const daily = readWindow(
    user,
    now,
    'llmTokensUsedToday',
    'llmTokensDailyLimit',
    'llmTokensDailyResetAt',
  )

  const exceededWindow: 'daily' | 'monthly' | null = !daily.withinLimit
    ? 'daily'
    : !monthly.withinLimit
      ? 'monthly'
      : null

  // When daily is exceeded, surface daily reset info at the top level so
  // existing callers (turn-policy, chat routes) that only read
  // `used/limit/resetAt` show the correct "retry at" to the user.
  const top = exceededWindow === 'daily' ? daily : monthly

  return {
    withinLimit: daily.withinLimit && monthly.withinLimit,
    used: top.used,
    limit: top.limit,
    resetAt: top.resetAt,
    exceededWindow,
    daily: { used: daily.used, limit: daily.limit, resetAt: daily.resetAt },
  }
}
