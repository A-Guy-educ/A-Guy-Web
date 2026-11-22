/**
 * `funnel` slice of GET /api/dashboard-metrics: where visitors and students
 * drop off on the way to paying.
 *
 * Three populations, all limited to the selected period:
 * - `visitors`: guest sessions that started in the period (landing-tracked
 *   ones only, see guest-insights-types.ts).
 * - `signups`: non-admin users created in the period. Every later step counts
 *   distinct users from that group, so each step is a subset of the one
 *   before it in practice (not enforced — a student can see pricing without
 *   ever meeting a wall).
 * - `payments`: every non-admin student with a funnel event or payment in the
 *   period, whenever they signed up — upgrade walls start at the 4th lesson,
 *   so most students who meet one are not new.
 *
 * Paywall / pricing / checkout steps come from `funnel-events`, which only
 * exists from FUNNEL_EVENTS_TRACKED_SINCE; signups before that date undercount
 * those steps.
 */

import type { LandingType } from '@/infra/analytics/guest-landing'
import type { PaywallGate } from '@/server/services/funnel-events'

import type { SignupSourceBreakdown } from './metrics-types'

/** Day the `funnel-events` collection started recording (Web #1625). */
export const FUNNEL_EVENTS_TRACKED_SINCE = '2026-11-18'

/** Days after signup that count as "the first week". */
export const FIRST_WEEK_DAYS = 7

/** Lesson dwell that counts as doing something (same bar as Product Health). */
export const ENGAGED_DWELL_SECONDS = 60

export interface VisitorFunnel {
  /** Guest sessions started in the period. */
  visitors: number
  /** Of those, sessions whose browser beacon fired — very likely human. */
  humans: number
  signupPromptShown: number
  googleClicked: number
  /** Sessions claimed by a new (non-admin) signup. */
  signedUp: number
}

export interface SignupFunnel {
  signedUp: number
  /** Alive: opened any lesson (even a bounce) or answered a question in the first week. */
  activeFirstWeek: number
  /**
   * Did something: ENGAGED_DWELL_SECONDS+ in one lesson visit, or answered a
   * question, in the first week.
   */
  engagedFirstWeek: number
  /** Did something again between 24h and 7 days after signup. */
  returnedFirstWeek: number
  /** Signups whose first week is over — the base for `activeDaysFirstWeek`. */
  weekCompleted: number
  /**
   * Sum over `weekCompleted` signups of the days (24h blocks from signup, 0-7)
   * they did something on. Average = activeDaysFirstWeek / weekCompleted.
   */
  activeDaysFirstWeek: number
  /** Met any upgrade wall (lesson, exercise or AI quota). */
  paywallShown: number
  pricingViewed: number
  checkoutStarted: number
  /** At least one succeeded payment. */
  paid: number
}

export interface PaymentFunnel {
  /** Distinct students who met any upgrade wall. */
  paywallShown: number
  /** Distinct students per wall; one student can count under several. */
  paywallByGate: Record<PaywallGate, number>
  pricingViewed: number
  checkoutStarted: number
  /** Distinct students with a succeeded first purchase (renewals are on the Revenue tab). */
  paid: number
}

export type FunnelLandingKey = LandingType | 'unknown'

export interface FunnelMetrics {
  /** Steps from `funnel-events` are only complete for signups on/after this day. */
  eventsTrackedSince: string
  visitors: VisitorFunnel
  signups: SignupFunnel
  /**
   * `weekCompleted` signups by days they did something on in their first
   * week: index 0 = no day, index 7 = every day.
   */
  firstWeekActiveDays: number[]
  payments: PaymentFunnel
  /** Signup funnel split by `users.signupSource`. */
  bySource: Record<keyof SignupSourceBreakdown, SignupFunnel>
  /**
   * Signup funnel split by the landing page type of the guest session the
   * student signed up from; `unknown` = no landing-tracked session.
   */
  byLandingType: Record<FunnelLandingKey, SignupFunnel>
  /** Visitor funnel split by landing page type. */
  visitorsByLandingType: Record<LandingType, VisitorFunnel>
}
