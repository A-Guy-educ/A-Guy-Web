/**
 * Bot-hit counters
 *
 * @fileType service
 * @domain analytics
 * @pattern anonymous-tracking
 * @ai-summary Daily per-category counters for UA-detected bot page loads.
 * One doc per (UTC day, category), bumped with `$inc` + upsert — no per-hit
 * documents and nothing identifying beyond the category.
 */

import type { BotCategory } from '@/infra/analytics/bot-user-agent'
import { getContentDb } from '@/infra/db/content-db'
import { logger } from '@/infra/utils/logger/logger'

export const BOT_HITS_COLLECTION = 'bot-hits'

let indexEnsured: Promise<void> | null = null

/** UTC "YYYY-MM-DD" — the bucket key, comparable as a string. */
export function botHitDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

async function ensureDayCategoryIndex(): Promise<void> {
  if (indexEnsured) return indexEnsured
  indexEnsured = (async () => {
    const db = await getContentDb()
    await db
      .collection(BOT_HITS_COLLECTION)
      .createIndex({ day: 1, category: 1 }, { name: 'bot_hits_day_category', unique: true })
  })().catch((err) => {
    indexEnsured = null
    logger.warn({ err }, 'bot-hits: failed to ensure day/category index — will retry')
  })
  return indexEnsured
}

export async function incrementBotHit(
  category: BotCategory,
  now: Date = new Date(),
): Promise<void> {
  try {
    await ensureDayCategoryIndex()
    const db = await getContentDb()
    await db
      .collection(BOT_HITS_COLLECTION)
      .updateOne(
        { day: botHitDay(now), category },
        { $inc: { count: 1 }, $setOnInsert: { createdAt: now } },
        { upsert: true },
      )
  } catch (err) {
    // Mongo retries an upsert that loses the first-hit-of-the-day race on the
    // unique index, so reaching here means a real failure. Dropping one count
    // is acceptable for a trend line; never let it surface to the request.
    logger.warn({ err, category }, 'bot-hits: increment failed')
  }
}
