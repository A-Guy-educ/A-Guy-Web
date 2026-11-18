'use client'

import { useEffect } from 'react'

/**
 * Upgrade walls that only exist in the browser. Mirrors the client-sent
 * subset of `PAYWALL_GATES` in `@/server/services/funnel-events` (the
 * `lesson` gate is a server redirect and records itself).
 */
export type ClientPaywallGate = 'exercise' | 'ai_quota'

export async function postPaywallShown(gate: ClientPaywallGate, path: string): Promise<void> {
  await fetch('/api/funnel-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gate, path: path.slice(0, 300) }),
    keepalive: true,
  })
}

/** Records one `paywall_shown` event per mount of an upgrade wall. */
export function usePaywallBeacon(gate: ClientPaywallGate): void {
  useEffect(() => {
    // Fire-and-forget: a lost analytics ping must never surface to the student.
    postPaywallShown(gate, window.location.pathname).catch(() => {})
  }, [gate])
}
