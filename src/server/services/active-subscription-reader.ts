/**
 * Read the user's active-ish subscription summary from Mongo.
 *
 * Mirrors A-Guy-Admin's `attachActiveSubscription` afterRead hook so that
 * Web's `/api/users/me` returns the same `activeSubscription` summary that
 * admin's does. Needed because Web's user route is a custom Next handler
 * (not Payload's built-in REST) — admin's Payload hooks don't run here.
 *
 * Shape must stay byte-equivalent to admin's; see
 * `A-Guy-Admin/src/server/payload/collections/Users/hooks/attachActiveSubscription-hook.ts`.
 * If admin's shape changes, update this file in lockstep.
 *
 * @fileType service
 * @domain billing
 */

import { ObjectId } from 'mongodb'

import { getContentDb } from '@/infra/db/content-db'
import type { ActiveSubscription } from '@/lib/tiers'

interface SubscriptionDoc {
  _id: ObjectId
  status?: string
  tierSlug?: string | null
  offerSlug?: string | null
  provider?: string | null
  currentPeriodEnd?: Date | string | null
  cancelAtPeriodEnd?: boolean | null
  paypalSubscriptionId?: string | null
}

/**
 * Return the latest non-terminal subscription for the given user, in the
 * same summary shape admin attaches via its afterRead hook. Returns `null`
 * when the user has no pending/active/past_due sub.
 */
export async function readActiveSubscription(userId: string): Promise<ActiveSubscription | null> {
  if (!ObjectId.isValid(userId)) return null
  const db = await getContentDb()
  const sub = (await db.collection('subscriptions').findOne(
    {
      user: new ObjectId(userId),
      // Include 'cancelled' so the current-plan card can render "Current
      // till {date}" between the cancel click and the end of the paid
      // period. Admin's own hook includes cancelled subs for the same
      // reason — see A-Guy-Admin attachActiveSubscription-hook.ts.
      status: { $in: ['pending', 'active', 'past_due', 'cancelled'] },
    },
    {
      sort: { createdAt: -1 },
      projection: {
        status: 1,
        tierSlug: 1,
        offerSlug: 1,
        provider: 1,
        currentPeriodEnd: 1,
        cancelAtPeriodEnd: 1,
        paypalSubscriptionId: 1,
      },
    },
  )) as SubscriptionDoc | null

  if (!sub) return null

  return {
    id: sub._id.toString(),
    status: (sub.status ?? 'pending') as ActiveSubscription['status'],
    tierSlug:
      typeof sub.tierSlug === 'string' ? (sub.tierSlug as ActiveSubscription['tierSlug']) : null,
    offerSlug: typeof sub.offerSlug === 'string' ? sub.offerSlug : null,
    provider: sub.provider === 'tranzilla' || sub.provider === 'paypal' ? sub.provider : null,
    currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString() : null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd === true,
    paypalSubscriptionId:
      typeof sub.paypalSubscriptionId === 'string' ? sub.paypalSubscriptionId : null,
  }
}
