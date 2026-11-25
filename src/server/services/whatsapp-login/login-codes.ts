/**
 * WhatsApp login codes
 *
 * @fileType service
 * @domain auth
 * @pattern whatsapp-login
 * @ai-summary Issues and checks the 6-digit one-time codes behind WhatsApp login. One live code per phone, stored only as an HMAC, expiring after 10 minutes or 5 wrong guesses.
 */

import { createHmac, randomInt, timingSafeEqual } from 'crypto'
import type { Collection } from 'mongodb'

import { getContentDb } from '@/infra/db/content-db'
import { logger } from '@/infra/utils/logger'

const COLLECTION = 'whatsapp_login_codes'
const CODE_TTL_MS = 10 * 60 * 1000
export const MAX_CODE_ATTEMPTS = 5

interface LoginCodeDoc {
  phone: string
  codeHash: string
  attempts: number
  expiresAt: Date
  createdAt: Date
}

export type CodeCheckResult = 'ok' | 'invalid' | 'expired'

let indexesEnsured: Promise<void> | null = null

async function codes(): Promise<Collection<LoginCodeDoc>> {
  const collection = (await getContentDb()).collection<LoginCodeDoc>(COLLECTION)
  if (!indexesEnsured) {
    indexesEnsured = Promise.all([
      collection.createIndex({ phone: 1 }, { unique: true, name: 'whatsapp_login_codes_phone' }),
      // Cleanup only — expiry is enforced by the queries below.
      collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, name: 'whatsapp_login_codes_ttl' },
      ),
    ])
      .then(() => undefined)
      .catch((err: unknown) => {
        indexesEnsured = null
        logger.warn({ err }, 'Failed to ensure WhatsApp login code indexes')
      })
  }
  await indexesEnsured
  return collection
}

/**
 * Six digits is a small space, so a plain hash would be reversible from a
 * database dump in milliseconds. Keying it with the server secret means a
 * leaked row is useless without the secret too.
 */
function hashCode(phone: string, code: string): string {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('PAYLOAD_SECRET is required')
  return createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex')
}

/**
 * Create a fresh code for `phone`, replacing any earlier one so only the most
 * recent message works. Returns the plain code for sending; it is never stored.
 */
export async function issueLoginCode(phone: string): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const now = new Date()
  await (
    await codes()
  ).replaceOne(
    { phone },
    {
      phone,
      codeHash: hashCode(phone, code),
      attempts: 0,
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      createdAt: now,
    },
    { upsert: true },
  )
  return code
}

/**
 * Check `code` against the live code for `phone`. A correct code is consumed
 * so it cannot be replayed. Every guess counts toward the attempt limit,
 * claimed atomically before comparing so parallel guesses cannot exceed it.
 */
export async function checkLoginCode(phone: string, code: string): Promise<CodeCheckResult> {
  const collection = await codes()
  const claimed = await collection.findOneAndUpdate(
    { phone, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_CODE_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { returnDocument: 'after' },
  )
  if (!claimed) return 'expired'

  const expected = Buffer.from(claimed.codeHash, 'hex')
  const actual = Buffer.from(hashCode(phone, code), 'hex')
  if (!timingSafeEqual(expected, actual)) return 'invalid'

  // Conditional on the hash so a code issued in between is left alone.
  const consumed = await collection.deleteOne({ phone, codeHash: claimed.codeHash })
  return consumed.deletedCount === 1 ? 'ok' : 'expired'
}
