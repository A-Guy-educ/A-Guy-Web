/**
 * `guestInsights` slice of GET /api/dashboard-metrics.
 *
 * Only guest-session docs written after landing attribution shipped (those
 * with `landingType`) are counted — older docs are excluded rather than
 * lumped into `other`, so percentages aren't skewed by pre-tracking rows.
 * They age out of every 30-day window within a month of release.
 */

import type { LandingType } from '@/infra/analytics/guest-landing'

export type LandingBreakdown = Record<LandingType, number>

export interface TopLandingPath {
  path: string
  type: LandingType
  count: number
}

export interface TopReferrer {
  host: string
  count: number
}

/**
 * Cohort: sessions whose onboarding started in the last 30 days. Each step
 * counts unique sessions that reached it. `completed` = claimed by a new
 * (non-admin) signup.
 */
export interface OnboardingFunnel {
  started: number
  personaSelected: number
  gradeSelected: number
  signupPromptShown: number
  googleClicked: number
  completed: number
}

export interface LandingConversion {
  guests: number
  converted: number
}

export interface UaBotHits {
  search: number
  socialPreview: number
  aiCrawler: number
  other: number
}

export interface GuestBotMetrics {
  /** Daily bot-hits counters (UA-detected; these never became guest sessions). */
  uaBotHitsLast30d: UaBotHits
  guestSessionsLast30d: number
  /** Sessions whose client-side beacon fired — very likely human. */
  jsConfirmedLast30d: number
  /** Sessions that never ran the beacon — possible bots, not certain. */
  unconfirmedLast30d: number
}

export interface GuestInsights {
  /** All-time. */
  landingBreakdown: LandingBreakdown
  landingBreakdownLast30d: LandingBreakdown
  /** Top 10, last 30 days. */
  topLandingPaths: TopLandingPath[]
  /** Top 10 external referrer hosts, last 30 days. Direct traffic omitted. */
  topReferrers: TopReferrer[]
  onboardingFunnel: OnboardingFunnel
  /** All-time, same population as `landingBreakdown`. */
  conversionByLandingType: Record<LandingType, LandingConversion>
  bots: GuestBotMetrics
}
