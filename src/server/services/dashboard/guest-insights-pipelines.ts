/**
 * Pure pipeline builders + result mappers for the `guestInsights` slice.
 * Kept free of I/O so the shapes are unit-testable without Mongo; the runner
 * lives in guest-insights.ts.
 *
 * Every guest-sessions pipeline opens with a `$match` (not a bare `$facet`)
 * so the planner can use the createdAt / onboarding indexes before fanning out.
 */

import type { Document } from 'mongodb'

import { BOT_CATEGORIES, type BotCategory } from '@/infra/analytics/bot-user-agent'
import { LANDING_TYPES, type LandingType } from '@/infra/analytics/guest-landing'

import type {
  GuestBotMetrics,
  LandingBreakdown,
  LandingConversion,
  OnboardingFunnel,
  TopLandingPath,
  TopReferrer,
  UaBotHits,
} from './guest-insights-types'

export const TOP_N = 10

/** Docs written before landing attribution shipped have no `landingType`. */
export const TRACKED_SESSION = { landingType: { $in: [...LANDING_TYPES] } }

interface CountRow {
  _id: unknown
  n: number
}

const exists = (field: string): Document => ({ $ne: [{ $type: `$${field}` }, 'missing'] })
const countIf = (cond: Document): Document => ({ $sum: { $cond: [cond, 1, 0] } })

function isConverted(adminRefs: unknown[]): Document {
  return { $and: [exists('claimedByUser'), { $not: [{ $in: ['$claimedByUser', adminRefs] }] }] }
}

const groupByLandingType = { $group: { _id: '$landingType', n: { $sum: 1 } } }

// ---------------------------------------------------------------------------
// Pipelines
// ---------------------------------------------------------------------------

export function buildAllTimePipeline(adminRefs: unknown[]): Document[] {
  return [
    { $match: TRACKED_SESSION },
    {
      $group: {
        _id: '$landingType',
        guests: { $sum: 1 },
        converted: countIf(isConverted(adminRefs)),
      },
    },
  ]
}

export function buildLast30dPipeline(since: Date): Document[] {
  return [
    { $match: { createdAt: { $gte: since }, ...TRACKED_SESSION } },
    {
      $facet: {
        landing: [groupByLandingType],
        topPaths: [
          { $group: { _id: { path: '$landingPath', type: '$landingType' }, n: { $sum: 1 } } },
          { $sort: { n: -1, _id: 1 } },
          { $limit: TOP_N },
        ],
        topReferrers: [
          { $match: { referrerHost: { $type: 'string' } } },
          { $group: { _id: '$referrerHost', n: { $sum: 1 } } },
          { $sort: { n: -1, _id: 1 } },
          { $limit: TOP_N },
        ],
        bots: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              jsConfirmed: countIf(exists('jsConfirmedAt')),
              unconfirmed: countIf({ $eq: ['$suspectedBot', true] }),
            },
          },
        ],
      },
    },
  ]
}

/** Cohort = sessions whose onboarding started on/after `since`. */
export function buildOnboardingFunnelPipeline(since: Date, adminRefs: unknown[]): Document[] {
  return [
    { $match: { 'onboarding.startedAt': { $gte: since } } },
    {
      $group: {
        _id: null,
        started: { $sum: 1 },
        personaSelected: countIf(exists('onboarding.personaSelectedAt')),
        gradeSelected: countIf(exists('onboarding.gradeSelectedAt')),
        signupPromptShown: countIf(exists('onboarding.signupPromptShownAt')),
        googleClicked: countIf(exists('onboarding.googleClickedAt')),
        completed: countIf(isConverted(adminRefs)),
      },
    },
  ]
}

export function buildBotHitsPipeline(sinceDay: string): Document[] {
  return [
    { $match: { day: { $gte: sinceDay } } },
    { $group: { _id: '$category', n: { $sum: '$count' } } },
  ]
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function isLandingType(value: unknown): value is LandingType {
  return typeof value === 'string' && (LANDING_TYPES as readonly string[]).includes(value)
}

export function emptyLandingBreakdown(): LandingBreakdown {
  return { lesson: 0, course: 0, start: 0, home: 0, other: 0 }
}

export function toLandingBreakdown(rows: CountRow[] | undefined): LandingBreakdown {
  const out = emptyLandingBreakdown()
  for (const row of rows ?? []) {
    if (isLandingType(row._id)) out[row._id] = row.n
  }
  return out
}

export function emptyConversionByLandingType(): Record<LandingType, LandingConversion> {
  return {
    lesson: { guests: 0, converted: 0 },
    course: { guests: 0, converted: 0 },
    start: { guests: 0, converted: 0 },
    home: { guests: 0, converted: 0 },
    other: { guests: 0, converted: 0 },
  }
}

export function toConversionByLandingType(
  rows: Array<{ _id: unknown; guests: number; converted: number }>,
): Record<LandingType, LandingConversion> {
  const out = emptyConversionByLandingType()
  for (const row of rows) {
    if (isLandingType(row._id)) out[row._id] = { guests: row.guests, converted: row.converted }
  }
  return out
}

export function toTopLandingPaths(
  rows: Array<{ _id: { path?: unknown; type?: unknown }; n: number }> | undefined,
): TopLandingPath[] {
  return (rows ?? []).flatMap((row) =>
    typeof row._id.path === 'string' && isLandingType(row._id.type)
      ? [{ path: row._id.path, type: row._id.type, count: row.n }]
      : [],
  )
}

export function toTopReferrers(rows: CountRow[] | undefined): TopReferrer[] {
  return (rows ?? []).flatMap((row) =>
    typeof row._id === 'string' ? [{ host: row._id, count: row.n }] : [],
  )
}

export function emptyOnboardingFunnel(): OnboardingFunnel {
  return {
    started: 0,
    personaSelected: 0,
    gradeSelected: 0,
    signupPromptShown: 0,
    googleClicked: 0,
    completed: 0,
  }
}

export function toOnboardingFunnel(row: Partial<OnboardingFunnel> | undefined): OnboardingFunnel {
  const empty = emptyOnboardingFunnel()
  if (!row) return empty
  return {
    started: row.started ?? 0,
    personaSelected: row.personaSelected ?? 0,
    gradeSelected: row.gradeSelected ?? 0,
    signupPromptShown: row.signupPromptShown ?? 0,
    googleClicked: row.googleClicked ?? 0,
    completed: row.completed ?? 0,
  }
}

const UA_BOT_KEY: Record<BotCategory, keyof UaBotHits> = {
  search: 'search',
  'social-preview': 'socialPreview',
  'ai-crawler': 'aiCrawler',
  other: 'other',
}

export function toUaBotHits(rows: CountRow[]): UaBotHits {
  const out: UaBotHits = { search: 0, socialPreview: 0, aiCrawler: 0, other: 0 }
  for (const row of rows) {
    const category = BOT_CATEGORIES.find((c) => c === row._id)
    if (category) out[UA_BOT_KEY[category]] += row.n
  }
  return out
}

export function toGuestBotMetrics(
  uaBotHitsLast30d: UaBotHits,
  row: { total?: number; jsConfirmed?: number; unconfirmed?: number } | undefined,
): GuestBotMetrics {
  return {
    uaBotHitsLast30d,
    guestSessionsLast30d: row?.total ?? 0,
    jsConfirmedLast30d: row?.jsConfirmed ?? 0,
    unconfirmedLast30d: row?.unconfirmed ?? 0,
  }
}
