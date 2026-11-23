'use client'

import { useEffect } from 'react'

import { useCurrentUser } from '@/client/hooks/useCurrentUser'
import { TIER_RANK, type TierSlug } from '@/lib/tiers/constants'
import { getUserTierRank } from '@/lib/tiers/user-tier'

/**
 * Upgrade walls that only exist in the browser. Mirrors the client-sent
 * subset of `PAYWALL_GATES` in `@/server/services/funnel-events` (the
 * `lesson` gate is a server redirect and records itself).
 */
export type ClientPaywallGate = 'exercise' | 'ai_quota'

type FunnelBeacon =
  | { type: 'paywall_shown'; gate: ClientPaywallGate; path: string }
  | { type: 'paywall_dismissed'; gate: ClientPaywallGate }
  | { type: 'plan_selected'; tier: TierSlug; gate: ClientPaywallGate | null }

async function postFunnelEvent(event: FunnelBeacon): Promise<void> {
  await fetch('/api/funnel-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
    keepalive: true,
  })
}

/**
 * Fire-and-forget funnel beacon: a lost analytics ping must never surface to
 * the student.
 */
export function sendFunnelEvent(event: FunnelBeacon): void {
  postFunnelEvent(event).catch(() => {})
}

export async function postPaywallShown(gate: ClientPaywallGate, path: string): Promise<void> {
  await postFunnelEvent({ type: 'paywall_shown', gate, path: path.slice(0, 300) })
}

/**
 * Lesson players treat a still-loading user as free tier, so the exercise
 * lock flashes for paying students until `/api/users/me` answers. Only a wall
 * that survives the load, for a student below the paid tiers, is recorded.
 */
export function isRealPaywall(
  gate: ClientPaywallGate,
  user: { currentTier?: string | null } | null,
  isLoading: boolean,
): boolean {
  if (isLoading) return false
  return gate !== 'exercise' || getUserTierRank(user) < TIER_RANK.basic
}

/** Records one `paywall_shown` event per mount of an upgrade wall. */
export function usePaywallBeacon(gate: ClientPaywallGate): void {
  const { user, isLoading } = useCurrentUser()
  const shouldRecord = isRealPaywall(
    gate,
    user as { currentTier?: string | null } | null,
    isLoading,
  )

  useEffect(() => {
    if (!shouldRecord) return
    // Fire-and-forget: a lost analytics ping must never surface to the student.
    postPaywallShown(gate, window.location.pathname).catch(() => {})
  }, [gate, shouldRecord])
}
