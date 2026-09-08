/**
 * Guest-session writes
 *
 * @fileType service
 * @domain analytics
 * @pattern anonymous-tracking
 * @ai-summary Insert/claim helpers for the `guest-sessions` collection. Writes
 * a doc when middleware detects a first anonymous visit and stamps the
 * claiming user id when that visitor later signs up.
 */

import { ObjectId, type Collection, type Document } from 'mongodb'

import { getContentDb } from '@/infra/db/content-db'
import { logger } from '@/infra/utils/logger/logger'

const COLLECTION = 'guest-sessions'
const DUPLICATE_KEY_ERROR = 11000

let indexEnsured: Promise<void> | null = null

async function collection(): Promise<Collection<Document>> {
  return (await getContentDb()).collection<Document>(COLLECTION)
}

/**
 * Ensure a unique index on `sessionId` so a middleware/layout race between
 * two concurrent first-hit requests never creates two rows for the same
 * cookie. Idempotent; cached per process.
 */
async function ensureSessionIdIndex(): Promise<void> {
  if (indexEnsured) return indexEnsured
  indexEnsured = (async () => {
    const col = await collection()
    await col.createIndex(
      { sessionId: 1 },
      {
        name: 'guest_sessions_session_id',
        unique: true,
        partialFilterExpression: { sessionId: { $exists: true } },
      },
    )
  })().catch((err) => {
    indexEnsured = null
    logger.warn({ err }, 'guest-sessions: failed to ensure sessionId index — will retry')
  })
  return indexEnsured
}

/**
 * Record a fresh anonymous visit. Silently no-ops when a doc for this
 * sessionId already exists (concurrent first-hit races) so callers can treat
 * this as fire-and-forget.
 *
 * `claimedByUser` is deliberately omitted — the dashboard aggregation counts
 * conversions with `$exists: true`, so the field must only appear on rows
 * that were actually claimed.
 */
export async function recordGuestSession(sessionId: string): Promise<void> {
  try {
    await ensureSessionIdIndex()
    const col = await collection()
    await col.insertOne({
      sessionId,
      createdAt: new Date(),
    })
  } catch (err) {
    if ((err as { code?: number })?.code === DUPLICATE_KEY_ERROR) return
    logger.warn({ err, sessionId }, 'guest-sessions: insert failed')
  }
}

/**
 * Stamp a guest-session as claimed by a newly-created user. Called from the
 * OAuth callback for genuinely new signups; safe when the doc doesn't exist
 * (e.g. cookie survived a DB reset).
 */
export async function claimGuestSession(sessionId: string, userId: string): Promise<void> {
  try {
    const col = await collection()
    await col.updateOne(
      { sessionId },
      {
        $set: {
          claimedByUser: new ObjectId(userId),
          claimedAt: new Date(),
        },
      },
    )
  } catch (err) {
    logger.warn({ err, sessionId, userId }, 'guest-sessions: claim failed')
  }
}
