/**
 * Payment-funnel event log: the steps between "using the product" and "paid"
 * that nothing else records.
 *
 * One doc per event in the `funnel-events` collection:
 * - `paywall_shown`    a student met an upgrade wall. `gate` says which:
 *                      `lesson` (practice/exam lesson redirected to the plan
 *                      store), `exercise` (free-tier exercise lock), or
 *                      `ai_quota` (AI chat quota used up).
 * - `pricing_viewed`   the /subscriptions page rendered. `returnTo` is the
 *                      page that sent them there, when known.
 * - `checkout_started` a tier was picked and Web asked Admin for a checkout.
 *                      `status` is Admin's HTTP status (>= 400 = it failed).
 *
 * Events are not deduplicated — a student who meets the same wall twice
 * writes two rows. Funnel counts use distinct users.
 *
 * Recording never throws: a lost analytics row must not break a page,
 * redirect or checkout.
 *
 * @fileType service
 * @domain analytics
 * @pattern event-log
 * @ai-summary Appends paywall / pricing / checkout funnel events for the dashboard
 */

import { ObjectId } from 'mongodb'

import { getContentDb } from '@/infra/db/content-db'
import { logger } from '@/infra/utils/logger/logger'

export const FUNNEL_EVENTS_COLLECTION = 'funnel-events'

export const PAYWALL_GATES = ['lesson', 'exercise', 'ai_quota'] as const
export type PaywallGate = (typeof PAYWALL_GATES)[number]

const MAX_PATH_LENGTH = 300

export type FunnelEvent =
  | { type: 'paywall_shown'; userId: string; gate: PaywallGate; path?: string | null }
  | { type: 'pricing_viewed'; userId: string | null; returnTo?: string | null }
  | {
      type: 'checkout_started'
      userId: string
      tier: string
      offerSlug?: string | null
      status: number
    }

let indexPromise: Promise<void> | null = null

async function ensureIndexes(): Promise<void> {
  indexPromise ??= (async () => {
    const db = await getContentDb()
    const collection = db.collection(FUNNEL_EVENTS_COLLECTION)
    try {
      await collection.createIndex({ type: 1, createdAt: 1 }, { name: 'funnel_events_type_at' })
      await collection.createIndex({ user: 1, createdAt: -1 }, { name: 'funnel_events_user' })
    } catch (err) {
      indexPromise = null
      logger.warn({ err }, 'Failed to ensure funnel-events indexes')
    }
  })()
  return indexPromise
}

function toUserRef(userId: string | null): ObjectId | string | null {
  if (!userId) return null
  return ObjectId.isValid(userId) && userId.length === 24 ? new ObjectId(userId) : userId
}

function clip(value: string | null | undefined): string | null {
  return value ? value.slice(0, MAX_PATH_LENGTH) : null
}

/** Pure — exported for unit tests. */
export function buildFunnelEventDoc(event: FunnelEvent, now: Date): Record<string, unknown> {
  const base = { type: event.type, user: toUserRef(event.userId), createdAt: now }
  switch (event.type) {
    case 'paywall_shown':
      return { ...base, gate: event.gate, path: clip(event.path) }
    case 'pricing_viewed':
      return { ...base, returnTo: clip(event.returnTo) }
    case 'checkout_started':
      return { ...base, tier: event.tier, offerSlug: event.offerSlug ?? null, status: event.status }
  }
}

export async function recordFunnelEvent(event: FunnelEvent): Promise<void> {
  try {
    await ensureIndexes()
    const db = await getContentDb()
    await db.collection(FUNNEL_EVENTS_COLLECTION).insertOne(buildFunnelEventDoc(event, new Date()))
  } catch (err) {
    logger.warn({ err, type: event.type }, 'funnel-events: record failed')
  }
}
