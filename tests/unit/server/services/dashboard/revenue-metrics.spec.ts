/**
 * Revenue tab metrics. Facet rows are fed straight into toRevenueMetrics, so
 * the status semantics (pending excluded, refunded = success) and the
 * tierSlug fallback are checked without a Mongo instance. FAILURE_CODE_EXPR
 * runs through a minimal evaluator for the handful of operators it uses.
 */

import type { Db, Document } from 'mongodb'
import { describe, expect, it, vi } from 'vitest'

import {
  aggregateTransactions,
  buildTransactionsFacet,
  FAILURE_CODE_EXPR,
  SCHOOL_SEAT_PRICE_AGOROT,
  toRevenueMetrics,
  type TransactionsFacetResult,
} from '@/server/services/dashboard/revenue-metrics'
import { computeDateBuckets } from '@/server/services/dashboard/date-buckets'
import { buildClassRoster } from '@/server/services/dashboard/user-segment'

function facetResult(overrides: Partial<TransactionsFacetResult> = {}): TransactionsFacetResult {
  return {
    revenueByCurrency: [],
    refundedTotal: [],
    failedTotal: [],
    statusCounts: [],
    topProducts: [],
    paymentOutcomes: [],
    failureReasons: [],
    b2cPayers: [],
    ...overrides,
  }
}

const EMPTY_ROSTER = buildClassRoster([])

function metrics(result: TransactionsFacetResult, roster = EMPTY_ROSTER, admins: string[] = []) {
  return toRevenueMetrics({ result, roster, adminUserIds: new Set(admins) })
}

describe('transactionCount / successRate', () => {
  const statusCounts = [
    { _id: 'succeeded', count: 6 },
    { _id: 'refunded', count: 1 },
    { _id: 'failed', count: 3 },
    { _id: 'pending', count: 40 },
  ]

  it('excludes pending (abandoned checkouts) from transactionCount', () => {
    expect(metrics(facetResult({ statusCounts })).transactionCount).toBe(10)
  })

  it('counts a refunded payment as a success', () => {
    // (6 + 1) / (6 + 1 + 3) — pending does not dilute the rate.
    expect(metrics(facetResult({ statusCounts })).successRate).toBe(70)
  })

  it('rounds to one decimal and is 0 with no settled rows', () => {
    const third = [
      { _id: 'succeeded', count: 1 },
      { _id: 'failed', count: 2 },
    ]
    expect(metrics(facetResult({ statusCounts: third })).successRate).toBe(33.3)
    const onlyPending = [{ _id: 'pending', count: 5 }]
    expect(metrics(facetResult({ statusCounts: onlyPending }))).toMatchObject({
      transactionCount: 0,
      successRate: 0,
    })
  })
})

describe('topProducts', () => {
  it('names product rows from the lookup and tier-only renewals by tierSlug', () => {
    const { topProducts } = metrics(
      facetResult({
        topProducts: [
          { _id: { product: null, tierSlug: 'premium' }, agorot: 9000, product: [] },
          { _id: { product: 'p1', tierSlug: null }, agorot: 5000, product: [{ name: 'Bagrut' }] },
          { _id: { product: 'gone-abc123', tierSlug: null }, agorot: 100, product: [] },
        ],
      }),
    )
    expect(topProducts).toEqual([
      { productName: 'Subscription — premium', agorot: 9000 },
      { productName: 'Bagrut', agorot: 5000 },
      { productName: '__DELETED__:abc123', agorot: 100 },
    ])
  })

  it('groups by product, keeping tierSlug only for rows without one', () => {
    const group = buildTransactionsFacet().topProducts?.[1]?.$group as Document
    expect(group._id).toEqual({
      product: { $ifNull: ['$product', null] },
      tierSlug: { $cond: [{ $eq: [{ $ifNull: ['$product', null] }, null] }, '$tierSlug', null] },
    })
  })
})

describe('payments', () => {
  it('splits by isRenewal and counts refunded rows as succeeded', () => {
    const facet = buildTransactionsFacet().paymentOutcomes ?? []
    expect(facet[0]).toEqual({ $match: { status: { $in: ['succeeded', 'refunded', 'failed'] } } })
    expect((facet[1]?.$group as Document)._id).toEqual({
      renewal: { $eq: ['$isRenewal', true] },
      failed: { $eq: ['$status', 'failed'] },
    })

    const { payments } = metrics(
      facetResult({
        paymentOutcomes: [
          { _id: { renewal: false, failed: false }, count: 7 },
          { _id: { renewal: false, failed: true }, count: 2 },
          { _id: { renewal: true, failed: false }, count: 4 },
        ],
      }),
    )
    expect(payments).toEqual({
      firstPurchase: { succeeded: 7, failed: 2 },
      renewal: { succeeded: 4, failed: 0 },
    })
  })
})

// --- minimal evaluator for FAILURE_CODE_EXPR -------------------------------

type Vars = Record<string, unknown>

function getPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (value === null || typeof value !== 'object') return undefined
    return (value as Record<string, unknown>)[key]
  }, source)
}

function evaluate(expr: unknown, doc: Document, vars: Vars = {}): unknown {
  if (typeof expr === 'string') {
    if (expr.startsWith('$$')) {
      const [name, ...rest] = expr.slice(2).split('.')
      return rest.length ? getPath(vars[name as string], rest.join('.')) : vars[name as string]
    }
    return expr.startsWith('$') ? getPath(doc, expr.slice(1)) : expr
  }
  const [op, arg] = Object.entries(expr as Document)[0] as [string, Document]
  if (op === '$ifNull') {
    for (const candidate of arg as unknown as unknown[]) {
      const value = evaluate(candidate, doc, vars)
      if (value !== null && value !== undefined) return value
    }
    return null
  }
  if (op === '$let') {
    const bound = Object.fromEntries(
      Object.entries(arg.vars as Document).map(([k, v]) => [k, evaluate(v, doc, vars)]),
    )
    return evaluate(arg.in, doc, { ...vars, ...bound })
  }
  if (op === '$regexFind') {
    const input = evaluate(arg.input, doc, vars)
    if (typeof input !== 'string') return null
    const match = new RegExp(arg.regex as string).exec(input)
    return match ? { match: match[0], captures: match.slice(1) } : null
  }
  if (op === '$arrayElemAt') {
    const [array, index] = arg as unknown as [unknown, number]
    const value = evaluate(array, doc, vars)
    return Array.isArray(value) ? value[index] : null
  }
  throw new Error(`evaluator does not support ${op}`)
}

describe('failureReasons', () => {
  const code = (doc: Document) => evaluate(FAILURE_CODE_EXPR, doc)

  it('prefers failureCode', () => {
    expect(
      code({
        failureCode: '004',
        metadata: { tranzilla: { responseCode: '033' } },
        errorMessage: 'Tranzilla declined — response code 051',
      }),
    ).toBe('004')
  })

  it('falls back to metadata.tranzilla.responseCode', () => {
    expect(
      code({
        metadata: { tranzilla: { responseCode: '033' } },
        errorMessage: 'Tranzilla declined — response code 051',
      }),
    ).toBe('033')
    // Older renewal declines carry only the metadata code, no errorMessage.
    expect(code({ isRenewal: true, metadata: { tranzilla: { responseCode: '004' } } })).toBe('004')
  })

  it('ignores a one-L metadata.tranzila key (Admin never writes it)', () => {
    expect(code({ metadata: { tranzila: { responseCode: '033' } } })).toBe('unknown')
  })

  it('falls back to the code parsed from errorMessage', () => {
    expect(code({ errorMessage: 'Tranzilla declined — response code 051' })).toBe('051')
  })

  it("is 'unknown' when nothing matches", () => {
    expect(code({ errorMessage: 'card declined' })).toBe('unknown')
    expect(code({})).toBe('unknown')
  })

  it('groups failed rows by provider + code, top 10 by count', () => {
    const facet = buildTransactionsFacet().failureReasons ?? []
    expect(facet[0]).toEqual({ $match: { status: 'failed' } })
    expect((facet[1]?.$group as Document)._id).toEqual({
      provider: { $ifNull: ['$provider', 'unknown'] },
      code: FAILURE_CODE_EXPR,
    })
    expect(facet.slice(2)).toEqual([{ $sort: { count: -1, agorot: -1 } }, { $limit: 10 }])

    const { failureReasons } = metrics(
      facetResult({
        failureReasons: [{ _id: { provider: 'tranzilla', code: 33 }, count: 3, agorot: 1500 }],
      }),
    )
    expect(failureReasons).toEqual([{ provider: 'tranzilla', code: '33', count: 3, agorot: 1500 }])
  })
})

describe('segments', () => {
  it('reports B2C payers + ILS revenue and a B2B seat estimate excluding admins', () => {
    const roster = buildClassRoster([
      { _id: 'c1', students: ['s1', 's2', 'admin'], teachers: ['t1'] },
      { _id: 'c2', students: ['s2', 's3'] },
    ])
    const { segments } = metrics(
      facetResult({
        revenueByCurrency: [
          { _id: 'ILS', total: 12000, count: 3 },
          { _id: 'USD', total: 999, count: 1 },
        ],
        b2cPayers: [{ n: 2 }],
      }),
      roster,
      ['admin'],
    )
    expect(segments).toEqual({
      b2c: { payers: 2, revenueAgorot: 12000 },
      b2b: {
        students: 3,
        seatPriceAgorot: SCHOOL_SEAT_PRICE_AGOROT,
        estimatedRevenueAgorot: 3 * 5900,
      },
    })
  })

  it('counts distinct payers across ObjectId/string encodings', () => {
    expect(buildTransactionsFacet().b2cPayers).toEqual([
      { $match: { status: 'succeeded', user: { $ne: null } } },
      { $group: { _id: { $toString: '$user' } } },
      { $count: 'n' },
    ])
  })
})

describe('aggregateTransactions', () => {
  it('runs one period + admin-filtered $facet pass over transactions', async () => {
    const aggregate = vi.fn(() => ({ toArray: async () => [facetResult()] }))
    const collection = vi.fn(() => ({ aggregate }))
    const buckets = computeDateBuckets('month')

    await aggregateTransactions(
      { collection } as unknown as Db,
      buckets,
      { refs: ['admin'], stringIds: ['admin'] },
      EMPTY_ROSTER,
    )

    expect(collection).toHaveBeenCalledWith('transactions')
    expect(aggregate).toHaveBeenCalledTimes(1)
    const pipeline = (aggregate.mock.calls[0] as unknown as [Document[]])[0]
    expect(pipeline).toEqual([
      { $match: { createdAt: { $gte: buckets.periodStart }, user: { $nin: ['admin'] } } },
      { $facet: buildTransactionsFacet() },
    ])
  })
})
