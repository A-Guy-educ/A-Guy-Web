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

import { createHash, randomBytes } from 'crypto'

import { ObjectId, type Collection, type Document } from 'mongodb'

import { getContentDb } from '@/infra/db/content-db'
import { logger } from '@/infra/utils/logger/logger'

const COLLECTION = 'guest-sessions'
const DUPLICATE_KEY_ERROR = 11000

/**
 * Admin's Payload collection ships a strict schema validator on
 * `guest-sessions` (tokenHash/tokenVersion/lastActiveAt/expiresAt/
 * hardExpiresAt/status/messageCount all required). Our funnel-tracking write
 * has to satisfy that validator or Mongo rejects the doc — which was the
 * silent failure that kept the dashboard tile stuck at 3.
 *
 * We fill the Admin-required fields with sensible defaults: tokenHash from a
 * per-row random salt (unique per doc), a 30-day expiry matching the guest
 * cookie, status=active, messageCount=0. Our own sessionId is added on top.
 */
const GUEST_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

function buildGuestSessionDoc(sessionId: string): Document {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + GUEST_SESSION_TTL_MS)
  // tokenHash is a UNIQUE index in Admin's collection, so it has to differ
  // per row. Hash a random salt + the sessionId so we never collide even
  // across concurrent inserts.
  const tokenHash = createHash('sha256').update(sessionId).update(randomBytes(16)).digest('hex')
  return {
    sessionId,
    tokenHash,
    tokenVersion: 1,
    createdAt: now,
    lastActiveAt: now,
    expiresAt,
    hardExpiresAt: expiresAt,
    status: 'active',
    messageCount: 0,
    updatedAt: now,
  }
}

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
    await col.insertOne(buildGuestSessionDoc(sessionId))
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
