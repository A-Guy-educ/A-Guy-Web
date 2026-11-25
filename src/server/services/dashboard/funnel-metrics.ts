/**
 * `funnel` slice of the dashboard metrics (types and step definitions in
 * funnel-types.ts).
 *
 * Three round-trips in parallel:
 * - guest-sessions grouped by landing type for the visitor steps;
 * - users created in the period, with one `$lookup` per later step, folded
 *   into per-user 0/1 flags and summed overall / by source / by landing type;
 * - funnel-events plus succeeded transactions in the period, grouped by
 *   student, for the payment steps of everyone active.
 *
 * Every user reference in the looked-up collections is written as an ObjectId
 * (checked on prod 2026-11-19); funnel-events and transactions may also hold
 * the string form, so those two match both. A failure degrades to an all-zero
 * slice instead of failing the whole response.
 */

import type { Db, Document } from 'mongodb'

import { LANDING_TYPES, type LandingType } from '@/infra/analytics/guest-landing'
import { logger } from '@/infra/utils/logger/logger'
import {
  FUNNEL_EVENTS_COLLECTION,
  PAYWALL_GATES,
  type PaywallGate,
} from '@/server/services/funnel-events'

import type { AdminUserRefs } from './admin-users'
import type { DateBuckets } from './date-buckets'
import {
  ENGAGED_DWELL_SECONDS,
  FIRST_WEEK_DAYS,
  FUNNEL_EVENTS_TRACKED_SINCE,
  type FunnelDeviceKey,
  type FunnelLandingKey,
  type FunnelMetrics,
  type GateStats,
  type PaymentFunnel,
  type SignupFunnel,
  type VisitorFunnel,
} from './funnel-types'
import {
  countRecordedExistingStudents,
  estimateExistingStudentSessions,
  excludeExistingStudents,
} from './existing-student-visits'
import { TRACKED_SESSION } from './guest-insights-pipelines'
import { DEVICE_GROUP, FUNNEL_DEVICE_KEYS } from './visitor-devices'
import { SIGNUP_SOURCE_KEYS, type SignupSourceBreakdown } from './metrics-types'
import {
  guestCohortMatch,
  userRefPredicate,
  usersCohortMatch,
  type UserCohort,
} from './user-segment'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = FIRST_WEEK_DAYS * DAY_MS

export const SIGNUP_STEPS = [
  'signedUp',
  'activeFirstWeek',
  'engagedFirstWeek',
  'returnedFirstWeek',
  'weekCompleted',
  'activeDaysFirstWeek',
  'paywallShown',
  'pricingViewed',
  'checkoutStarted',
  'paid',
] as const satisfies readonly (keyof SignupFunnel)[]

const VISITOR_STEPS = [
  'visitors',
  'humans',
  'signupPromptShown',
  'googleClicked',
  'googleCancelled',
  'googleFailed',
  'signedUp',
] as const satisfies readonly (keyof VisitorFunnel)[]

const FUNNEL_LANDING_KEYS: readonly FunnelLandingKey[] = [...LANDING_TYPES, 'unknown']

const exists = (field: string): Document => ({ $ne: [{ $type: `$${field}` }, 'missing'] })
const countIf = (cond: Document | string): Document => ({ $sum: { $cond: [cond, 1, 0] } })
const hasRows = (field: string): Document => ({ $gt: [{ $size: `$${field}` }, 0] })

/** `user` equals the looked-up student, in either id encoding. */
const userIsStudent: Document = { $in: ['$user', ['$$uid', { $toString: '$$uid' }]] }

// ---------------------------------------------------------------------------
// Pipelines
// ---------------------------------------------------------------------------

export function buildVisitorFunnelPipeline(
  since: Date,
  adminRefs: unknown[],
  cohortMatch: Document = {},
  excludeMatch: Document = {},
  groupBy: Document | string = '$landingType',
): Document[] {
  const unclaimedOutcome = (outcome: string): Document => ({
    $and: [{ $eq: ['$onboarding.googleOutcome', outcome] }, { $not: [exists('claimedByUser')] }],
  })
  return [
    {
      $match: { createdAt: { $gte: since }, ...TRACKED_SESSION, ...cohortMatch, ...excludeMatch },
    },
    {
      $group: {
        _id: groupBy,
        visitors: { $sum: 1 },
        humans: countIf(exists('jsConfirmedAt')),
        signupPromptShown: countIf(exists('onboarding.signupPromptShownAt')),
        googleClicked: countIf(exists('onboarding.googleClickedAt')),
        googleCancelled: countIf(unclaimedOutcome('cancelled')),
        googleFailed: countIf(unclaimedOutcome('failed')),
        signedUp: countIf({
          $and: [exists('claimedByUser'), { $not: [{ $in: ['$claimedByUser', adminRefs] }] }],
        }),
      },
    },
  ]
}

/**
 * Activity rows for the student within the first week: `at`, and `engaged`
 * when the row counts as doing something (`engagedIf`, default always).
 */
function firstWeekLookup(
  from: string,
  atField: string,
  as: string,
  engagedIf: Document = { $literal: true },
): Document {
  return {
    $lookup: {
      from,
      let: { uid: '$_id', start: '$createdAt' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$user', '$$uid'] },
                { $gte: [`$${atField}`, '$$start'] },
                { $lt: [`$${atField}`, { $add: ['$$start', WEEK_MS] }] },
              ],
            },
          },
        },
        { $project: { _id: 0, at: `$${atField}`, engaged: engagedIf } },
      ],
      as,
    },
  }
}

function sumSteps(): Document {
  return Object.fromEntries(SIGNUP_STEPS.map((step) => [step, { $sum: `$${step}` }]))
}

/** Day index (0-6) after signup of each engaged activity row, deduplicated. */
const ENGAGED_DAYS: Document = {
  $setUnion: [
    {
      $map: {
        input: {
          $filter: { input: { $concatArrays: ['$visits', '$attempts'] }, cond: '$$this.engaged' },
        },
        in: { $floor: { $divide: [{ $subtract: ['$$this.at', '$createdAt'] }, DAY_MS] } },
      },
    },
  ],
}

export function buildSignupFunnelPipeline(
  since: Date,
  now: Date,
  cohort?: UserCohort | null,
): Document[] {
  const flag = (cond: Document | string): Document => ({ $cond: [cond, 1, 0] })
  const hasEvent = (type: string): Document => ({ $in: [type, '$events.type'] })
  const weekDone = { $lte: [{ $add: ['$createdAt', WEEK_MS] }, now] }

  return [
    {
      $match: {
        createdAt: { $gte: since },
        role: { $ne: 'admin' },
        ...usersCohortMatch(cohort),
      },
    },
    { $project: { createdAt: 1, signupSource: 1 } },
    firstWeekLookup('lesson-visits', 'startedAt', 'visits', {
      $gte: [{ $ifNull: ['$dwellSeconds', 0] }, ENGAGED_DWELL_SECONDS],
    }),
    firstWeekLookup('question-attempts', 'createdAt', 'attempts'),
    {
      $lookup: {
        from: FUNNEL_EVENTS_COLLECTION,
        let: { uid: '$_id' },
        pipeline: [
          { $match: { $expr: userIsStudent } },
          { $group: { _id: '$type' } },
          { $project: { _id: 0, type: '$_id' } },
        ],
        as: 'events',
      },
    },
    {
      $lookup: {
        from: 'transactions',
        let: { uid: '$_id' },
        pipeline: [
          { $match: { status: 'succeeded', $expr: userIsStudent } },
          { $limit: 1 },
          { $project: { _id: 1 } },
        ],
        as: 'payments',
      },
    },
    {
      $lookup: {
        from: 'guest-sessions',
        localField: '_id',
        foreignField: 'claimedByUser',
        pipeline: [
          { $match: TRACKED_SESSION },
          { $sort: { claimedAt: 1 } },
          { $limit: 1 },
          { $project: { _id: 0, landingType: 1 } },
        ],
        as: 'landing',
      },
    },
    { $set: { engagedDays: ENGAGED_DAYS, weekDone } },
    {
      $project: {
        source: { $ifNull: ['$signupSource', 'unknown'] },
        landingType: { $ifNull: [{ $first: '$landing.landingType' }, 'unknown'] },
        signedUp: { $literal: 1 },
        activeFirstWeek: flag({ $or: [hasRows('visits'), hasRows('attempts')] }),
        engagedFirstWeek: flag({ $gt: [{ $size: '$engagedDays' }, 0] }),
        returnedFirstWeek: flag({
          $anyElementTrue: [{ $map: { input: '$engagedDays', in: { $gte: ['$$this', 1] } } }],
        }),
        weekCompleted: flag('$weekDone'),
        activeDaysFirstWeek: { $cond: ['$weekDone', { $size: '$engagedDays' }, 0] },
        activeDays: { $size: '$engagedDays' },
        weekDone: 1,
        paywallShown: flag(hasEvent('paywall_shown')),
        pricingViewed: flag(hasEvent('pricing_viewed')),
        checkoutStarted: flag(hasEvent('checkout_started')),
        paid: flag(hasRows('payments')),
      },
    },
    {
      $facet: {
        total: [{ $group: { _id: null, ...sumSteps() } }],
        bySource: [{ $group: { _id: '$source', ...sumSteps() } }],
        byLandingType: [{ $group: { _id: '$landingType', ...sumSteps() } }],
        activeDays: [
          { $match: { weekDone: true } },
          { $group: { _id: '$activeDays', n: { $sum: 1 } } },
        ],
      },
    },
  ]
}

/**
 * One row per payment step with the distinct students who reached it in the
 * period. Walls are `paywall:<gate>` plus `paywall` for any gate; anonymous
 * pricing views have no user and are dropped.
 */
export function buildPaymentFunnelPipeline(
  since: Date,
  adminRefs: unknown[],
  cohort?: UserCohort | null,
): Document[] {
  const user = { ...userRefPredicate(adminRefs, cohort), $ne: null }
  return [
    { $match: { createdAt: { $gte: since }, user } },
    {
      $project: {
        _id: 0,
        user: { $toString: '$user' },
        step: {
          $cond: [
            { $eq: ['$type', 'paywall_shown'] },
            { $concat: ['paywall:', { $ifNull: ['$gate', 'unknown'] }] },
            '$type',
          ],
        },
      },
    },
    {
      $unionWith: {
        coll: 'transactions',
        pipeline: [
          {
            $match: {
              createdAt: { $gte: since },
              status: 'succeeded',
              isRenewal: { $ne: true },
              user,
            },
          },
          { $project: { _id: 0, user: { $toString: '$user' }, step: 'paid' } },
        ],
      },
    },
    { $group: { _id: '$user', steps: { $addToSet: '$step' } } },
    {
      $set: {
        steps: {
          $cond: [
            {
              $anyElementTrue: {
                $map: {
                  input: '$steps',
                  as: 's',
                  in: { $eq: [{ $indexOfCP: ['$$s', 'paywall:'] }, 0] },
                },
              },
            },
            { $concatArrays: ['$steps', ['paywall']] },
            '$steps',
          ],
        },
      },
    },
    { $unwind: '$steps' },
    { $group: { _id: '$steps', users: { $sum: 1 } } },
  ]
}

/**
 * One row per wall with distinct students, total hits, repeat students, and
 * students who skipped it. Conversions are credited to the last wall a
 * student met before their first plan pick / first payment (picks on
 * /subscriptions have no gate of their own, so last-wall is used for all).
 */
export function buildGateStatsPipeline(
  since: Date,
  adminRefs: unknown[],
  cohort?: UserCohort | null,
): Document[] {
  const user = { ...userRefPredicate(adminRefs, cohort), $ne: null }
  const firstAt = (type: string): Document => ({
    $min: {
      $map: {
        input: { $filter: { input: '$events', cond: { $eq: ['$$this.type', type] } } },
        in: '$$this.at',
      },
    },
  })
  const lastWallBefore = (field: string): Document => ({
    $getField: {
      field: 'gate',
      input: {
        $last: {
          $filter: {
            input: '$events',
            cond: {
              $and: [
                { $eq: ['$$this.type', 'paywall_shown'] },
                { $lte: ['$$this.at', `$${field}`] },
              ],
            },
          },
        },
      },
    },
  })
  return [
    {
      $match: {
        createdAt: { $gte: since },
        user,
        type: { $in: ['paywall_shown', 'paywall_dismissed', 'plan_selected'] },
      },
    },
    { $project: { _id: 0, user: { $toString: '$user' }, type: 1, gate: 1, at: '$createdAt' } },
    {
      $unionWith: {
        coll: 'transactions',
        pipeline: [
          {
            $match: {
              createdAt: { $gte: since },
              status: 'succeeded',
              isRenewal: { $ne: true },
              user,
            },
          },
          { $project: { _id: 0, user: { $toString: '$user' }, type: 'paid', at: '$createdAt' } },
        ],
      },
    },
    { $sort: { at: 1 } },
    { $group: { _id: '$user', events: { $push: { type: '$type', gate: '$gate', at: '$at' } } } },
    { $set: { pickedAt: firstAt('plan_selected'), paidAt: firstAt('paid') } },
    {
      $set: {
        decidedPlanGate: lastWallBefore('pickedAt'),
        decidedPaidGate: lastWallBefore('paidAt'),
        shown: {
          $map: {
            input: {
              $filter: { input: '$events', cond: { $eq: ['$$this.type', 'paywall_shown'] } },
            },
            in: '$$this.gate',
          },
        },
        dismissed: {
          $map: {
            input: {
              $filter: { input: '$events', cond: { $eq: ['$$this.type', 'paywall_dismissed'] } },
            },
            in: '$$this.gate',
          },
        },
      },
    },
    { $set: { gate: { $setUnion: ['$shown'] } } },
    { $unwind: '$gate' },
    {
      $set: {
        hits: { $size: { $filter: { input: '$shown', cond: { $eq: ['$$this', '$gate'] } } } },
      },
    },
    {
      $group: {
        _id: '$gate',
        students: { $sum: 1 },
        hits: { $sum: '$hits' },
        repeatStudents: countIf({ $gte: ['$hits', 2] }),
        dismissedStudents: countIf({ $in: ['$gate', '$dismissed'] }),
        decidedPlan: countIf({ $eq: ['$decidedPlanGate', '$gate'] }),
        decidedPaid: countIf({ $eq: ['$decidedPaidGate', '$gate'] }),
      },
    },
  ]
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export type VisitorRow = { _id: unknown } & Partial<VisitorFunnel>
export type SignupRow = { _id: unknown } & Partial<SignupFunnel>

export interface SignupFacet {
  total: SignupRow[]
  bySource: SignupRow[]
  byLandingType: SignupRow[]
  activeDays: Array<{ _id: unknown; n: number }>
}

export function emptySignupFunnel(): SignupFunnel {
  return Object.fromEntries(SIGNUP_STEPS.map((step) => [step, 0])) as unknown as SignupFunnel
}

export function emptyVisitorFunnel(): VisitorFunnel {
  return Object.fromEntries(VISITOR_STEPS.map((step) => [step, 0])) as unknown as VisitorFunnel
}

function addRow<T extends object>(target: T, row: Partial<T>, steps: readonly (keyof T)[]): T {
  return Object.fromEntries(
    steps.map((step) => [step, Number(target[step] ?? 0) + Number(row[step] ?? 0)]),
  ) as T
}

/** Folds grouped rows into fixed keys; ids outside `keys` land in `fallback`. */
function bucketRows<K extends string, T extends object>(
  rows: Array<{ _id: unknown } & Partial<T>> | undefined,
  keys: readonly K[],
  fallback: K,
  empty: () => T,
  steps: readonly (keyof T)[],
): Record<K, T> {
  let result = Object.fromEntries(keys.map((key) => [key, empty()])) as Record<K, T>
  for (const row of rows ?? []) {
    const key = keys.includes(row._id as K) ? (row._id as K) : fallback
    result = { ...result, [key]: addRow(result[key], row, steps) }
  }
  return result
}

/** Histogram over 0..FIRST_WEEK_DAYS active days; out-of-range rows are dropped. */
export function toActiveDaysHistogram(rows: SignupFacet['activeDays'] | undefined): number[] {
  return Array.from(
    { length: FIRST_WEEK_DAYS + 1 },
    (_, days) => rows?.find((row) => row._id === days)?.n ?? 0,
  )
}

export type PaymentStepRow = { _id: unknown; users: number }

export type GateStatsRow = { _id: unknown } & Partial<GateStats>

export function emptyGateStats(): GateStats {
  return {
    students: 0,
    hits: 0,
    repeatStudents: 0,
    dismissedStudents: 0,
    decidedPlan: 0,
    decidedPaid: 0,
  }
}

export function toGateStats(rows: GateStatsRow[] | undefined): Record<PaywallGate, GateStats> {
  return Object.fromEntries(
    PAYWALL_GATES.map((gate) => {
      const { _id: _gate, ...row } = rows?.find((r) => r._id === gate) ?? { _id: gate }
      return [gate, { ...emptyGateStats(), ...row }]
    }),
  ) as Record<PaywallGate, GateStats>
}

export function toPaymentFunnel(
  rows: PaymentStepRow[] | undefined,
  gateRows?: GateStatsRow[],
): PaymentFunnel {
  const count = (step: string): number => rows?.find((row) => row._id === step)?.users ?? 0
  return {
    paywallShown: count('paywall'),
    paywallByGate: Object.fromEntries(
      PAYWALL_GATES.map((gate) => [gate, count(`paywall:${gate}`)]),
    ) as Record<PaywallGate, number>,
    byGate: toGateStats(gateRows),
    planSelected: count('plan_selected'),
    paywallDismissed: count('paywall_dismissed'),
    pricingViewed: count('pricing_viewed'),
    checkoutStarted: count('checkout_started'),
    paid: count('paid'),
  }
}

export function toFunnelMetrics(input: {
  visitorRows: VisitorRow[] | undefined
  signupFacet: SignupFacet | undefined
  paymentRows: PaymentStepRow[] | undefined
  gateRows?: GateStatsRow[]
  existingStudentVisits?: number
  googleOutcomesSince?: Date | null
  deviceRows?: VisitorRow[]
}): FunnelMetrics {
  const { visitorRows, signupFacet, paymentRows, gateRows } = input
  const visitorsByLandingType = bucketRows<LandingType, VisitorFunnel>(
    visitorRows,
    LANDING_TYPES,
    'other',
    emptyVisitorFunnel,
    VISITOR_STEPS,
  )
  const visitors = Object.values(visitorsByLandingType).reduce(
    (acc, row) => addRow(acc, row, VISITOR_STEPS),
    emptyVisitorFunnel(),
  )
  const total = signupFacet?.total[0]
  return {
    eventsTrackedSince: FUNNEL_EVENTS_TRACKED_SINCE,
    existingStudentVisits: input.existingStudentVisits ?? 0,
    googleOutcomesSince: input.googleOutcomesSince?.toISOString().slice(0, 10) ?? null,
    visitors,
    signups: total ? addRow(emptySignupFunnel(), total, SIGNUP_STEPS) : emptySignupFunnel(),
    firstWeekActiveDays: toActiveDaysHistogram(signupFacet?.activeDays),
    payments: toPaymentFunnel(paymentRows, gateRows),
    bySource: bucketRows<keyof SignupSourceBreakdown, SignupFunnel>(
      signupFacet?.bySource,
      SIGNUP_SOURCE_KEYS,
      'other',
      emptySignupFunnel,
      SIGNUP_STEPS,
    ),
    byLandingType: bucketRows<FunnelLandingKey, SignupFunnel>(
      signupFacet?.byLandingType,
      FUNNEL_LANDING_KEYS,
      'unknown',
      emptySignupFunnel,
      SIGNUP_STEPS,
    ),
    visitorsByLandingType,
    visitorsByDevice: bucketRows<FunnelDeviceKey, VisitorFunnel>(
      input.deviceRows,
      FUNNEL_DEVICE_KEYS,
      'unknown',
      emptyVisitorFunnel,
      VISITOR_STEPS,
    ),
  }
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/** Visitor funnel with existing students who logged back in dropped from every step. */
async function aggregateVisitors(
  db: Db,
  buckets: DateBuckets,
  adminUserRefs: AdminUserRefs,
  cohort: UserCohort | null | undefined,
): Promise<{
  visitorRows: VisitorRow[]
  deviceRows: VisitorRow[]
  existingStudentVisits: number
  googleOutcomesSince: Date | null
}> {
  const since = buckets.periodStart
  const estimate = await estimateExistingStudentSessions(db, since, buckets.now)
  const visitorsBy = (groupBy: Document | string) =>
    db
      .collection('guest-sessions')
      .aggregate<VisitorRow>(
        buildVisitorFunnelPipeline(
          since,
          adminUserRefs.refs,
          guestCohortMatch(cohort),
          excludeExistingStudents(estimate.ids),
          groupBy,
        ),
      )
      .toArray()
  const [visitorRows, deviceRows, recorded] = await Promise.all([
    visitorsBy('$landingType'),
    visitorsBy(DEVICE_GROUP),
    countRecordedExistingStudents(db, since),
  ])
  return {
    visitorRows,
    deviceRows,
    existingStudentVisits: recorded + estimate.ids.length,
    googleOutcomesSince: estimate.outcomesSince,
  }
}

export async function aggregateFunnel(
  db: Db,
  buckets: DateBuckets,
  adminUserRefs: AdminUserRefs,
  cohort?: UserCohort | null,
): Promise<FunnelMetrics> {
  try {
    const since = buckets.periodStart
    const events = db.collection(FUNNEL_EVENTS_COLLECTION)
    const [visitors, [signupFacet], paymentRows, gateRows] = await Promise.all([
      aggregateVisitors(db, buckets, adminUserRefs, cohort),
      db
        .collection('users')
        .aggregate<SignupFacet>(buildSignupFunnelPipeline(since, buckets.now, cohort))
        .toArray(),
      events
        .aggregate<PaymentStepRow>(buildPaymentFunnelPipeline(since, adminUserRefs.refs, cohort))
        .toArray(),
      events
        .aggregate<GateStatsRow>(buildGateStatsPipeline(since, adminUserRefs.refs, cohort))
        .toArray(),
    ])
    return toFunnelMetrics({ ...visitors, signupFacet, paymentRows, gateRows })
  } catch (err) {
    logger.warn({ err }, 'dashboard-metrics: funnel slice failed — returning empty')
    return toFunnelMetrics({
      visitorRows: undefined,
      signupFacet: undefined,
      paymentRows: undefined,
    })
  }
}
