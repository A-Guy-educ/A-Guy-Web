/**
 * Guest-session event writes
 *
 * @fileType service
 * @domain analytics
 * @pattern anonymous-tracking
 * @ai-summary Stamps client-reported milestones (JS confirmation, onboarding
 * funnel steps) onto an existing `guest-sessions` doc. Never upserts — an
 * unknown sessionId is a no-op, so a forged or stale cookie can't create rows.
 *
 * All timestamps use first-write-wins semantics via the aggregation `$min`
 * (which ignores missing fields), so repeat visits or double-clicks never
 * overwrite when a step first happened.
 */

import type { Document } from 'mongodb'

import type {
  GuestSessionEvent,
  OnboardingStep,
  OnboardingTrigger,
} from '@/infra/analytics/guest-session-event-contract'
import { logger } from '@/infra/utils/logger/logger'

import { guestSessionsCollection } from './guest-session-writer'

function firstWrite(field: string): Document {
  return { $min: [`$${field}`, '$$NOW'] }
}

/**
 * Pipeline-style update for one onboarding step. Every step also stamps
 * `startedAt` — reaching any step implies the flow started, and `$min` keeps
 * the earlier value when `started` was already recorded. The trigger is kept
 * from the first call that supplied one.
 */
export function buildOnboardingStepUpdate(
  step: OnboardingStep,
  trigger: OnboardingTrigger | null,
): Document[] {
  const set: Document = {
    'onboarding.startedAt': firstWrite('onboarding.startedAt'),
    [`onboarding.${step}At`]: firstWrite(`onboarding.${step}At`),
  }
  if (trigger) {
    set['onboarding.trigger'] = {
      $ifNull: ['$onboarding.trigger', { $literal: { type: trigger.type, id: trigger.id } }],
    }
  }
  return [{ $set: set }]
}

export async function recordOnboardingStep(
  sessionId: string,
  step: OnboardingStep,
  trigger: OnboardingTrigger | null,
): Promise<boolean> {
  try {
    const col = await guestSessionsCollection()
    const result = await col.updateOne({ sessionId }, buildOnboardingStepUpdate(step, trigger))
    return result.matchedCount > 0
  } catch (err) {
    logger.warn({ err, sessionId, step }, 'guest-sessions: onboarding step write failed')
    return false
  }
}

/**
 * Mark the session as having executed client-side JS. Returns whether a doc
 * matched so the client can retry later if the beacon beat the insert.
 */
export async function confirmGuestSessionJs(sessionId: string): Promise<boolean> {
  try {
    const col = await guestSessionsCollection()
    const result = await col.updateOne({ sessionId }, [
      { $set: { jsConfirmedAt: firstWrite('jsConfirmedAt'), suspectedBot: false } },
    ])
    return result.matchedCount > 0
  } catch (err) {
    logger.warn({ err, sessionId }, 'guest-sessions: js confirmation write failed')
    return false
  }
}

/** Entry point for the beacon route. Returns whether a session doc matched. */
export function recordGuestSessionEvent(
  sessionId: string,
  event: GuestSessionEvent,
): Promise<boolean> {
  if (event.event === 'js_confirmed') return confirmGuestSessionJs(sessionId)
  return recordOnboardingStep(sessionId, event.step, event.trigger ?? null)
}
