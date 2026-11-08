/**
 * Revenue tab: one $facet pass over `transactions` for the selected period,
 * admins excluded.
 *
 * Status semantics:
 * - `pending` rows are abandoned checkouts that are never cleaned up, so
 *   they never count towards transactionCount or the success rate.
 * - A `refunded` payment did go through, so it counts as a success.
 *
 * Revenue stays platform-wide — the Users-tab B2B/B2C segment filter is not
 * applied here. The B2B segment block is an estimate from the class roster
 * (no school subscriptions exist yet), priced at SCHOOL_SEAT_PRICE_AGOROT.
 */

import type { Db, Document } from 'mongodb'

import type { AdminUserRefs } from './admin-users'
import type { DateBuckets } from './date-buckets'
import type {
  CurrencyRevenue,
  FailureReason,
  PaymentOutcomeCounts,
  RevenueMetrics,
  TopProduct,
} from './metrics-types'
import type { ClassRoster } from './user-segment'

/** ₪59/month per student — placeholder until school subscriptions exist. */
export const SCHOOL_SEAT_PRICE_AGOROT = 5900

const DEFAULT_CURRENCIES = ['ILS', 'USD', 'EUR']
const TOP_PRODUCTS_LIMIT = 5
const FAILURE_REASONS_LIMIT = 10
const SETTLED_STATUSES = ['succeeded', 'refunded', 'failed']

/**
 * Failure code, first present of: `failureCode` (newer Admin writes),
 * `metadata.tranzilla.responseCode`, the code in an errorMessage like
 * "Tranzilla declined — response code 033", else 'unknown'.
 */
export const FAILURE_CODE_EXPR: Document = {
  $ifNull: [
    '$failureCode',
    '$metadata.tranzilla.responseCode',
    {
      $let: {
        vars: { m: { $regexFind: { input: '$errorMessage', regex: 'response code (\\w+)' } } },
        in: { $arrayElemAt: ['$$m.captures', 0] },
      },
    },
    'unknown',
  ],
}

export interface TransactionsFacetResult {
  revenueByCurrency: Array<{ _id: string; total: number; count: number }>
  refundedTotal: Array<{ total: number }>
  failedTotal: Array<{ total: number }>
  statusCounts: Array<{ _id: string; count: number }>
  topProducts: Array<{
    _id: { product: unknown; tierSlug: unknown }
    agorot: number
    product: Array<{ name?: string; slug?: string }>
  }>
  paymentOutcomes: Array<{ _id: { renewal: boolean; failed: boolean }; count: number }>
  failureReasons: Array<{
    _id: { provider: unknown; code: unknown }
    count: number
    agorot: number
  }>
  b2cPayers: Array<{ n: number }>
}

const sumAmount = { $sum: { $ifNull: ['$amount', 0] } }

export function buildTransactionsFacet(): Record<string, Document[]> {
  return {
    revenueByCurrency: [
      { $match: { status: 'succeeded' } },
      {
        $group: {
          _id: { $ifNull: ['$currency', 'ILS'] },
          total: sumAmount,
          count: { $sum: 1 },
        },
      },
    ],
    refundedTotal: [
      { $match: { status: 'refunded' } },
      { $group: { _id: null, total: sumAmount } },
    ],
    failedTotal: [{ $match: { status: 'failed' } }, { $group: { _id: null, total: sumAmount } }],
    statusCounts: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
    // Tranzila renewals carry only `tierSlug`, so the tier is the fallback
    // key; it is nulled when a product exists so product rows stay merged.
    topProducts: [
      { $match: { status: 'succeeded' } },
      {
        $group: {
          _id: {
            product: { $ifNull: ['$product', null] },
            tierSlug: {
              $cond: [{ $eq: [{ $ifNull: ['$product', null] }, null] }, '$tierSlug', null],
            },
          },
          agorot: sumAmount,
        },
      },
      { $sort: { agorot: -1 } },
      { $limit: TOP_PRODUCTS_LIMIT },
      {
        $lookup: {
          from: 'products',
          localField: '_id.product',
          foreignField: '_id',
          as: 'product',
        },
      },
    ],
    paymentOutcomes: [
      { $match: { status: { $in: SETTLED_STATUSES } } },
      {
        $group: {
          _id: {
            renewal: { $eq: ['$isRenewal', true] },
            failed: { $eq: ['$status', 'failed'] },
          },
          count: { $sum: 1 },
        },
      },
    ],
    failureReasons: [
      { $match: { status: 'failed' } },
      {
        $group: {
          _id: { provider: { $ifNull: ['$provider', 'unknown'] }, code: FAILURE_CODE_EXPR },
          count: { $sum: 1 },
          agorot: sumAmount,
        },
      },
      { $sort: { count: -1, agorot: -1 } },
      { $limit: FAILURE_REASONS_LIMIT },
    ],
    // `user` is written as ObjectId or string; stringify so one payer is one row.
    b2cPayers: [
      { $match: { status: 'succeeded', user: { $ne: null } } },
      { $group: { _id: { $toString: '$user' } } },
      { $count: 'n' },
    ],
  }
}

function toCurrencyRevenue(rows: TransactionsFacetResult['revenueByCurrency']): CurrencyRevenue {
  const totals: CurrencyRevenue = {}
  for (const currency of DEFAULT_CURRENCIES) totals[currency] = 0
  for (const row of rows) {
    // $ifNull only substitutes null/missing, not the empty string, so an
    // "" currency bucket slips past the pipeline default. Coerce here so
    // those rows still contribute to ILS instead of being silently dropped.
    const currency = row._id && row._id.length > 0 ? row._id : 'ILS'
    totals[currency] = (totals[currency] || 0) + row.total
  }
  return totals
}

function toTopProducts(rows: TransactionsFacetResult['topProducts']): TopProduct[] {
  return rows.map((row) => {
    const productDoc = row.product?.[0]
    const tierSlug = typeof row._id?.tierSlug === 'string' ? row._id.tierSlug : null
    const idFragment = String(row._id?.product ?? '').slice(-6)
    const productName =
      productDoc?.name ||
      productDoc?.slug ||
      (tierSlug ? `Subscription — ${tierSlug}` : `__DELETED__:${idFragment}`)
    return { productName, agorot: row.agorot }
  })
}

function toPayments(rows: TransactionsFacetResult['paymentOutcomes']): RevenueMetrics['payments'] {
  const empty = (): PaymentOutcomeCounts => ({ succeeded: 0, failed: 0 })
  const payments = { firstPurchase: empty(), renewal: empty() }
  for (const row of rows) {
    const bucket = row._id.renewal ? payments.renewal : payments.firstPurchase
    if (row._id.failed) bucket.failed += row.count
    else bucket.succeeded += row.count
  }
  return payments
}

function toFailureReasons(rows: TransactionsFacetResult['failureReasons']): FailureReason[] {
  return rows.map((row) => ({
    provider: String(row._id.provider ?? 'unknown'),
    code: String(row._id.code ?? 'unknown'),
    count: row.count,
    agorot: row.agorot,
  }))
}

function countStatus(rows: TransactionsFacetResult['statusCounts'], status: string): number {
  return rows.find((row) => row._id === status)?.count ?? 0
}

/** Pure assembly — exported for unit tests. */
export function toRevenueMetrics(input: {
  result: TransactionsFacetResult
  roster: ClassRoster
  adminUserIds: Set<string>
}): RevenueMetrics {
  const { result, roster, adminUserIds } = input
  const totalRevenueAgorot = toCurrencyRevenue(result.revenueByCurrency)

  const succeeded = countStatus(result.statusCounts, 'succeeded')
  const refunded = countStatus(result.statusCounts, 'refunded')
  const failed = countStatus(result.statusCounts, 'failed')
  const transactionCount = succeeded + refunded + failed
  const successRate =
    transactionCount > 0 ? Math.round(((succeeded + refunded) / transactionCount) * 1000) / 10 : 0

  // Same admin exclusion as b2bMetrics.students, so the two tiles agree.
  const students = [...roster.students].filter((id) => !adminUserIds.has(id)).length

  return {
    totalRevenueAgorot,
    refundedAgorot: result.refundedTotal[0]?.total ?? 0,
    failedAgorot: result.failedTotal[0]?.total ?? 0,
    transactionCount,
    successRate,
    topProducts: toTopProducts(result.topProducts),
    payments: toPayments(result.paymentOutcomes),
    failureReasons: toFailureReasons(result.failureReasons),
    segments: {
      b2c: {
        payers: result.b2cPayers[0]?.n ?? 0,
        revenueAgorot: totalRevenueAgorot.ILS ?? 0,
      },
      b2b: {
        students,
        seatPriceAgorot: SCHOOL_SEAT_PRICE_AGOROT,
        estimatedRevenueAgorot: students * SCHOOL_SEAT_PRICE_AGOROT,
      },
    },
  }
}

export async function aggregateTransactions(
  db: Db,
  buckets: DateBuckets,
  adminUserRefs: AdminUserRefs,
  roster: ClassRoster,
): Promise<RevenueMetrics> {
  const [result] = (await db
    .collection('transactions')
    .aggregate<TransactionsFacetResult>([
      {
        $match: {
          createdAt: { $gte: buckets.periodStart },
          user: { $nin: adminUserRefs.refs },
        },
      },
      { $facet: buildTransactionsFacet() },
    ])
    .toArray()) as [TransactionsFacetResult]

  return toRevenueMetrics({
    result,
    roster,
    adminUserIds: new Set(adminUserRefs.stringIds),
  })
}
