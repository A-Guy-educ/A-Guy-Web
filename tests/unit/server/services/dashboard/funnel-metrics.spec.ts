/**
 * Funnel slice of the dashboard metrics. Pipelines are checked for the
 * filters that decide who is counted (admins, cohort, anonymous rows,
 * renewals); the mappers are fed grouped rows directly.
 */

import type { Db, Document } from 'mongodb'
import { describe, expect, it } from 'vitest'

import { computeDateBuckets } from '@/server/services/dashboard/date-buckets'
import {
  aggregateFunnel,
  buildGateStatsPipeline,
  buildPaymentFunnelPipeline,
  buildSignupFunnelPipeline,
  buildVisitorFunnelPipeline,
  emptyGateStats,
  emptySignupFunnel,
  toActiveDaysHistogram,
  toFunnelMetrics,
} from '@/server/services/dashboard/funnel-metrics'
import { FUNNEL_EVENTS_TRACKED_SINCE } from '@/server/services/dashboard/funnel-types'
import type { UserCohort } from '@/server/services/dashboard/user-segment'

const SINCE = new Date('2026-10-19T00:00:00.000Z')
const NOW = new Date('2026-11-19T00:00:00.000Z')
const ADMINS = ['admin-1']
const B2C: UserCohort = { segment: 'b2c', mode: 'nin', refs: ['school-1'], stringIds: ['school-1'] }

const firstMatch = (pipeline: Document[]): Document => pipeline[0]?.$match as Document

describe('buildVisitorFunnelPipeline', () => {
  it('counts tracked sessions from the period, scoped by the cohort match', () => {
    const cohortMatch = { $or: [{ claimedByUser: { $exists: false } }] }
    const match = firstMatch(buildVisitorFunnelPipeline(SINCE, ADMINS, cohortMatch))
    expect(match.createdAt).toEqual({ $gte: SINCE })
    expect(match.landingType).toBeDefined()
    expect(match.$or).toEqual(cohortMatch.$or)
  })

  it('does not count sessions claimed by admins as signups', () => {
    const group = buildVisitorFunnelPipeline(SINCE, ADMINS)[1]?.$group as Document
    expect(JSON.stringify(group.signedUp)).toContain('admin-1')
  })
})

describe('buildSignupFunnelPipeline', () => {
  it('starts from non-admin users created in the period, scoped by cohort', () => {
    expect(firstMatch(buildSignupFunnelPipeline(SINCE, NOW, B2C))).toEqual({
      createdAt: { $gte: SINCE },
      role: { $ne: 'admin' },
      _id: { $nin: ['school-1'] },
    })
  })

  it('looks up each later step', () => {
    const from = buildSignupFunnelPipeline(SINCE, NOW)
      .filter((stage) => stage.$lookup)
      .map((stage) => stage.$lookup.from)
    expect(from).toEqual([
      'lesson-visits',
      'question-attempts',
      'funnel-events',
      'transactions',
      'guest-sessions',
    ])
  })

  it('counts a lesson visit as doing something only past the dwell bar', () => {
    const visits = buildSignupFunnelPipeline(SINCE, NOW).find(
      (stage) => stage.$lookup?.from === 'lesson-visits',
    )?.$lookup as Document
    const project = visits.pipeline.at(-1).$project as Document
    expect(project.engaged).toEqual({ $gte: [{ $ifNull: ['$dwellSeconds', 0] }, 60] })
  })

  it('builds the active-days histogram from finished first weeks only', () => {
    const facet = buildSignupFunnelPipeline(SINCE, NOW).at(-1)?.$facet as Document
    expect(facet.activeDays[0]).toEqual({ $match: { weekDone: true } })
  })
})

describe('toActiveDaysHistogram', () => {
  it('fills days 0-7 and drops anything outside', () => {
    expect(
      toActiveDaysHistogram([
        { _id: 1, n: 180 },
        { _id: 0, n: 126 },
        { _id: 7, n: 2 },
        { _id: 9, n: 5 },
      ]),
    ).toEqual([126, 180, 0, 0, 0, 0, 0, 2])
    expect(toActiveDaysHistogram(undefined)).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
  })
})

describe('buildPaymentFunnelPipeline', () => {
  const pipeline = buildPaymentFunnelPipeline(SINCE, ADMINS, B2C)

  it('drops admins, students outside the cohort and anonymous rows', () => {
    expect(firstMatch(pipeline).user).toEqual({ $nin: ['admin-1', 'school-1'], $ne: null })
  })

  it('counts first purchases only', () => {
    const union = pipeline.find((stage) => stage.$unionWith)?.$unionWith as Document
    expect(union.coll).toBe('transactions')
    expect(union.pipeline[0].$match).toMatchObject({
      status: 'succeeded',
      isRenewal: { $ne: true },
    })
  })
})

describe('buildGateStatsPipeline', () => {
  const pipeline = buildGateStatsPipeline(SINCE, ADMINS, B2C)

  it('reads wall, skip and plan events plus first purchases for the cohort', () => {
    expect(firstMatch(pipeline)).toEqual({
      createdAt: { $gte: SINCE },
      user: { $nin: ['admin-1', 'school-1'], $ne: null },
      type: { $in: ['paywall_shown', 'paywall_dismissed', 'plan_selected'] },
    })
    const union = pipeline.find((stage) => stage.$unionWith)?.$unionWith as Document
    expect(union.pipeline[0].$match).toMatchObject({
      status: 'succeeded',
      isRenewal: { $ne: true },
    })
  })

  it("orders each student's events by time before crediting the last wall", () => {
    const sortAt = pipeline.findIndex((stage) => stage.$sort)
    const groupAt = pipeline.findIndex((stage) => stage.$group)
    expect(pipeline[sortAt]).toEqual({ $sort: { at: 1 } })
    expect(sortAt).toBeLessThan(groupAt)
  })
})

describe('toFunnelMetrics', () => {
  it('sums visitors across landing types and folds unknown types into other', () => {
    const metrics = toFunnelMetrics({
      visitorRows: [
        {
          _id: 'lesson',
          visitors: 10,
          humans: 8,
          signupPromptShown: 5,
          googleClicked: 3,
          signedUp: 2,
        },
        {
          _id: 'mystery',
          visitors: 4,
          humans: 1,
          signupPromptShown: 0,
          googleClicked: 0,
          signedUp: 0,
        },
      ],
      signupFacet: undefined,
      paymentRows: undefined,
    })
    expect(metrics.visitors).toEqual({
      visitors: 14,
      humans: 9,
      signupPromptShown: 5,
      googleClicked: 3,
      signedUp: 2,
    })
    expect(metrics.visitorsByLandingType.other.visitors).toBe(4)
    expect(metrics.visitorsByLandingType.home.visitors).toBe(0)
  })

  it('maps the signup funnel overall, by source and by landing type', () => {
    const row = { ...emptySignupFunnel(), signedUp: 3, activeFirstWeek: 2, returnedFirstWeek: 1 }
    const metrics = toFunnelMetrics({
      visitorRows: [],
      signupFacet: {
        total: [{ _id: null, ...row }],
        bySource: [
          { _id: 'google', ...row },
          { _id: 'tiktok', ...row },
        ],
        byLandingType: [{ _id: 'unknown', ...row }],
      },
      paymentRows: [],
    })
    expect(metrics.signups).toEqual(row)
    expect(metrics.bySource.google).toEqual(row)
    expect(metrics.bySource.other).toEqual(row)
    expect(metrics.bySource.direct).toEqual(emptySignupFunnel())
    expect(metrics.byLandingType.unknown).toEqual(row)
    expect(metrics.eventsTrackedSince).toBe(FUNNEL_EVENTS_TRACKED_SINCE)
  })

  it('maps payment steps, with zero for steps nobody reached', () => {
    const metrics = toFunnelMetrics({
      visitorRows: [],
      signupFacet: undefined,
      paymentRows: [
        { _id: 'paywall', users: 3 },
        { _id: 'paywall:ai_quota', users: 2 },
        { _id: 'paywall:exercise', users: 1 },
        { _id: 'pricing_viewed', users: 1 },
        { _id: 'plan_selected', users: 2 },
        { _id: 'paywall_dismissed', users: 1 },
      ],
      gateRows: [{ _id: 'exercise', students: 1, hits: 4, repeatStudents: 1, decidedPaid: 1 }],
    })
    expect(metrics.payments).toEqual({
      paywallShown: 3,
      paywallByGate: { lesson: 0, exercise: 1, ai_quota: 2 },
      byGate: {
        lesson: emptyGateStats(),
        exercise: { ...emptyGateStats(), students: 1, hits: 4, repeatStudents: 1, decidedPaid: 1 },
        ai_quota: emptyGateStats(),
      },
      planSelected: 2,
      paywallDismissed: 1,
      pricingViewed: 1,
      checkoutStarted: 0,
      paid: 0,
    })
  })
})

describe('aggregateFunnel', () => {
  it('degrades to an all-zero slice when a query fails', async () => {
    const db = {
      collection: () => ({
        aggregate: () => ({ toArray: () => Promise.reject(new Error('boom')) }),
      }),
    } as unknown as Db
    const metrics = await aggregateFunnel(db, computeDateBuckets('month'), {
      refs: [],
      stringIds: [],
    })
    expect(metrics.signups).toEqual(emptySignupFunnel())
    expect(metrics.payments.paywallShown).toBe(0)
    expect(metrics.visitors.visitors).toBe(0)
  })
})
