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
  FIRST_WEEK_DAYS,
  FUNNEL_EVENTS_TRACKED_SINCE,
  type FunnelLandingKey,
  type FunnelMetrics,
  type PaymentFunnel,
  type SignupFunnel,
  type VisitorFunnel,
} from './funnel-types'
import { TRACKED_SESSION } from './guest-insights-pipelines'
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
  'returnedFirstWeek',
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
  'signedUp',
] as const satisfies readonly (keyof VisitorFunnel)[]

const FUNNEL_LANDING_KEYS: readonly FunnelLandingKey[] = [...LANDING_TYPES, 'unknown']

const exists = (field: string): Document => ({ $ne: [{ $type: `$${field}` }, 'missing'] })
const countIf = (cond: Document): Document => ({ $sum: { $cond: [cond, 1, 0] } })
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
): Document[] {
  return [
    { $match: { createdAt: { $gte: since }, ...TRACKED_SESSION, ...cohortMatch } },
    {
      $group: {
        _id: '$landingType',
        visitors: { $sum: 1 },
        humans: countIf(exists('jsConfirmedAt')),
        signupPromptShown: countIf(exists('onboarding.signupPromptShownAt')),
        googleClicked: countIf(exists('onboarding.googleClickedAt')),
        signedUp: countIf({
          $and: [exists('claimedByUser'), { $not: [{ $in: ['$claimedByUser', adminRefs] }] }],
        }),
      },
    },
  ]
}

/** Activity rows (`at` field) for the student within the first week. */
function firstWeekLookup(from: string, atField: string, as: string): Document {
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
        { $project: { _id: 0, at: `$${atField}` } },
      ],
      as,
    },
  }
}

function sumSteps(): Document {
  return Object.fromEntries(SIGNUP_STEPS.map((step) => [step, { $sum: `$${step}` }]))
}

export function buildSignupFunnelPipeline(since: Date, cohort?: UserCohort | null): Document[] {
  const flag = (cond: Document): Document => ({ $cond: [cond, 1, 0] })
  const hasEvent = (type: string): Document => ({ $in: [type, '$events.type'] })
  const returned = {
    $anyElementTrue: [
      {
        $map: {
          input: { $concatArrays: ['$visits', '$attempts'] },
          as: 'a',
          in: { $gte: ['$$a.at', { $add: ['$createdAt', DAY_MS] }] },
        },
      },
    ],
  }

  return [
    {
      $match: {
        createdAt: { $gte: since },
        role: { $ne: 'admin' },
        ...usersCohortMatch(cohort),
      },
    },
    { $project: { createdAt: 1, signupSource: 1 } },
    firstWeekLookup('lesson-visits', 'startedAt', 'visits'),
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
    {
      $project: {
        source: { $ifNull: ['$signupSource', 'unknown'] },
        landingType: { $ifNull: [{ $first: '$landing.landingType' }, 'unknown'] },
        signedUp: { $literal: 1 },
        activeFirstWeek: flag({ $or: [hasRows('visits'), hasRows('attempts')] }),
        returnedFirstWeek: flag(returned),
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

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export type VisitorRow = { _id: unknown } & Partial<VisitorFunnel>
export type SignupRow = { _id: unknown } & Partial<SignupFunnel>

export interface SignupFacet {
  total: SignupRow[]
  bySource: SignupRow[]
  byLandingType: SignupRow[]
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

export type PaymentStepRow = { _id: unknown; users: number }

export function toPaymentFunnel(rows: PaymentStepRow[] | undefined): PaymentFunnel {
  const count = (step: string): number => rows?.find((row) => row._id === step)?.users ?? 0
  return {
    paywallShown: count('paywall'),
    paywallByGate: Object.fromEntries(
      PAYWALL_GATES.map((gate) => [gate, count(`paywall:${gate}`)]),
    ) as Record<PaywallGate, number>,
    pricingViewed: count('pricing_viewed'),
    checkoutStarted: count('checkout_started'),
    paid: count('paid'),
  }
}

export function toFunnelMetrics(input: {
  visitorRows: VisitorRow[] | undefined
  signupFacet: SignupFacet | undefined
  paymentRows: PaymentStepRow[] | undefined
}): FunnelMetrics {
  const { visitorRows, signupFacet, paymentRows } = input
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
    visitors,
    signups: total ? addRow(emptySignupFunnel(), total, SIGNUP_STEPS) : emptySignupFunnel(),
    payments: toPaymentFunnel(paymentRows),
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
  }
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export async function aggregateFunnel(
  db: Db,
  buckets: DateBuckets,
  adminUserRefs: AdminUserRefs,
  cohort?: UserCohort | null,
): Promise<FunnelMetrics> {
  try {
    const since = buckets.periodStart
    const [visitorRows, [signupFacet], paymentRows] = await Promise.all([
      db
        .collection('guest-sessions')
        .aggregate<VisitorRow>(
          buildVisitorFunnelPipeline(since, adminUserRefs.refs, guestCohortMatch(cohort)),
        )
        .toArray(),
      db
        .collection('users')
        .aggregate<SignupFacet>(buildSignupFunnelPipeline(since, cohort))
        .toArray(),
      db
        .collection(FUNNEL_EVENTS_COLLECTION)
        .aggregate<PaymentStepRow>(buildPaymentFunnelPipeline(since, adminUserRefs.refs, cohort))
        .toArray(),
    ])
    return toFunnelMetrics({ visitorRows, signupFacet, paymentRows })
  } catch (err) {
    logger.warn({ err }, 'dashboard-metrics: funnel slice failed — returning empty')
    return toFunnelMetrics({
      visitorRows: undefined,
      signupFacet: undefined,
      paymentRows: undefined,
    })
  }
}
