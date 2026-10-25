/**
 * Client beacons for the anonymous guest-session funnel.
 *
 * Posts to `/api/guest-session/event`, which keys the write off the httpOnly
 * guest cookie — nothing here knows or sends a session id. Every call is
 * fire-and-forget: analytics must never block or break the UI.
 *
 * `keepalive` lets the `googleClicked` beacon survive the immediate
 * navigation to the OAuth endpoint.
 */

import type {
  GuestSessionEvent,
  OnboardingStep,
  OnboardingTrigger,
} from '@/infra/analytics/guest-session-event-contract'

const ENDPOINT = '/api/guest-session/event'

async function postGuestSessionEvent(event: GuestSessionEvent): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify(event),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { recorded?: unknown }
    return data.recorded === true
  } catch {
    return false
  }
}

export function trackOnboardingStep(step: OnboardingStep, trigger?: OnboardingTrigger): void {
  void postGuestSessionEvent({ event: 'onboarding', step, ...(trigger ? { trigger } : {}) })
}

export function confirmGuestJs(): Promise<boolean> {
  return postGuestSessionEvent({ event: 'js_confirmed' })
}
