/**
 * Wire contract for `POST /api/guest-session/event` — client beacons that
 * stamp milestones onto the visitor's guest-session doc.
 *
 * The body never carries a session id: the route reads the httpOnly
 * `guest_session_id` cookie, so a client can only ever touch its own row.
 *
 * CRITICAL: No PII — step names and content ids only.
 */

import { z } from 'zod'

export const ONBOARDING_STEPS = [
  'started',
  'personaSelected',
  'gradeSelected',
  'signupPromptShown',
  'googleClicked',
] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

const OnboardingTriggerSchema = z.object({
  type: z.enum(['lesson', 'course']),
  id: z.string().min(1).max(64),
})

export type OnboardingTrigger = z.infer<typeof OnboardingTriggerSchema>

export const GuestSessionEventSchema = z.discriminatedUnion('event', [
  z.object({ event: z.literal('js_confirmed') }),
  z.object({
    event: z.literal('onboarding'),
    step: z.enum(ONBOARDING_STEPS),
    trigger: OnboardingTriggerSchema.optional(),
  }),
])

export type GuestSessionEvent = z.infer<typeof GuestSessionEventSchema>
