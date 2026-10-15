/**
 * Shape of the `activeSubscription` virtual field that Admin attaches to
 * `/api/users/me` via an afterRead hook on self-reads only.
 *
 * Null when the user has no active-ish subscription — in that case, access
 * is driven by `user.currentTier` directly (free users, legacy one-time
 * paid users, or the gap between cancellation + period-end expiry).
 *
 * Source of truth: `A-Guy-Admin/src/server/payload/collections/Users` after-
 * read hook.
 *
 * @fileType types
 * @domain billing
 */

import type { TierSlug } from './constants'

export type SubscriptionStatus = 'pending' | 'active' | 'past_due' | 'cancelled'

export interface ActiveSubscription {
  id: string
  status: SubscriptionStatus
  tierSlug: TierSlug | null
  offerSlug: 'default' | 'intro3mo' | 'test' | string | null
  provider: 'tranzilla' | 'paypal' | null
  /** ISO 8601 timestamp when the current paid period ends. */
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  paypalSubscriptionId: string | null
}

export function hasPastDueSubscription(sub: ActiveSubscription | null | undefined): boolean {
  return sub?.status === 'past_due'
}

export function willCancelAtPeriodEnd(sub: ActiveSubscription | null | undefined): boolean {
  return sub?.status === 'cancelled' && sub?.cancelAtPeriodEnd === true
}
