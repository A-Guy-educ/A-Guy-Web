/**
 * `guestInsights` slice of the dashboard metrics: landing attribution,
 * onboarding funnel, and bot share for anonymous visitors.
 *
 * Four independent round-trips run in parallel, each opening with an
 * index-backed `$match`. A failure here degrades to an all-zero slice
 * instead of failing the whole /api/dashboard-metrics response — Dash parses
 * the object with zod defaults either way.
 */

import type { Db } from 'mongodb'

import { logger } from '@/infra/utils/logger/logger'
import { BOT_HITS_COLLECTION, botHitDay } from '@/server/services/guest-sessions/bot-hits-writer'

import type { AdminUserRefs } from './admin-users'
import type { DateBuckets } from './date-buckets'
import {
  buildAllTimePipeline,
  buildBotHitsPipeline,
  buildLast30dPipeline,
  buildOnboardingFunnelPipeline,
  emptyConversionByLandingType,
  emptyLandingBreakdown,
  emptyOnboardingFunnel,
  toConversionByLandingType,
  toGuestBotMetrics,
  toLandingBreakdown,
  toOnboardingFunnel,
  toTopLandingPaths,
  toTopReferrers,
  toUaBotHits,
} from './guest-insights-pipelines'
import type { GuestInsights, OnboardingFunnel } from './guest-insights-types'

const GUEST_SESSIONS = 'guest-sessions'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

interface Last30dFacet {
  landing: Array<{ _id: unknown; n: number }>
  topPaths: Array<{ _id: { path?: unknown; type?: unknown }; n: number }>
  topReferrers: Array<{ _id: unknown; n: number }>
  bots: Array<{ total?: number; jsConfirmed?: number; unconfirmed?: number }>
}

export function emptyGuestInsights(): GuestInsights {
  return {
    landingBreakdown: emptyLandingBreakdown(),
    landingBreakdownLast30d: emptyLandingBreakdown(),
    topLandingPaths: [],
    topReferrers: [],
    onboardingFunnel: emptyOnboardingFunnel(),
    conversionByLandingType: emptyConversionByLandingType(),
    bots: toGuestBotMetrics({ search: 0, socialPreview: 0, aiCrawler: 0, other: 0 }, undefined),
  }
}

async function computeGuestInsights(
  db: Db,
  buckets: DateBuckets,
  adminUserRefs: AdminUserRefs,
): Promise<GuestInsights> {
  const since = new Date(buckets.now.getTime() - THIRTY_DAYS_MS)
  const sessions = db.collection(GUEST_SESSIONS)

  const [allTime, [last30d], [funnel], botHits] = await Promise.all([
    sessions
      .aggregate<{
        _id: unknown
        guests: number
        converted: number
      }>(buildAllTimePipeline(adminUserRefs.refs))
      .toArray(),
    sessions.aggregate<Last30dFacet>(buildLast30dPipeline(since)).toArray(),
    sessions
      .aggregate<Partial<OnboardingFunnel>>(
        buildOnboardingFunnelPipeline(since, adminUserRefs.refs),
      )
      .toArray(),
    db
      .collection(BOT_HITS_COLLECTION)
      .aggregate<{ _id: unknown; n: number }>(buildBotHitsPipeline(botHitDay(since)))
      .toArray(),
  ])

  return {
    landingBreakdown: toLandingBreakdown(allTime.map((row) => ({ _id: row._id, n: row.guests }))),
    landingBreakdownLast30d: toLandingBreakdown(last30d?.landing),
    topLandingPaths: toTopLandingPaths(last30d?.topPaths),
    topReferrers: toTopReferrers(last30d?.topReferrers),
    onboardingFunnel: toOnboardingFunnel(funnel),
    conversionByLandingType: toConversionByLandingType(allTime),
    bots: toGuestBotMetrics(toUaBotHits(botHits), last30d?.bots[0]),
  }
}

export async function aggregateGuestInsights(
  db: Db,
  buckets: DateBuckets,
  adminUserRefs: AdminUserRefs,
): Promise<GuestInsights> {
  try {
    return await computeGuestInsights(db, buckets, adminUserRefs)
  } catch (err) {
    logger.warn({ err }, 'dashboard-metrics: guestInsights slice failed — returning empty')
    return emptyGuestInsights()
  }
}
