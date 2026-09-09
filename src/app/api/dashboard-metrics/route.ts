/**
 * GET /api/dashboard-metrics?period=week|month|year
 *
 * Admin-only endpoint powering the /dashboard page. Ported from the Payload
 * admin's /api/admin/dashboard-metrics but rewritten as raw-MongoDB $facet
 * aggregations to hit the <500ms warm perf target (the original serialized
 * 40+ ORM calls and timed out on Vercel).
 *
 * Response shape is unchanged — see DashboardMetricsResponse. The optional
 * `productHealth` slice (Dash PR #16 wireframe) is attached when
 * PRODUCT_HEALTH_ENABLED is truthy and driven by the following query
 * params (all optional; validated in product-health/params.ts):
 *   range=7d|30d|90d|custom, start, end, courseId, granularity
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { AccountRole } from '@/infra/auth/roles'
import { getContentDb } from '@/infra/db/content-db'
import { getWebUser } from '@/infra/web-api/mongo-payload'
import { logger } from '@/infra/utils/logger/logger'
import { computeDashboardMetrics } from '@/server/services/dashboard/metrics-service'
import { VALID_PERIODS, type Period } from '@/server/services/dashboard/metrics-types'
import { isProductHealthEnabled } from '@/server/services/dashboard/product-health/config'
import { parseProductHealthParams } from '@/server/services/dashboard/product-health/params'
import { computeProductHealth } from '@/server/services/dashboard/product-health/service'
import type { ProductHealthPayload } from '@/server/services/dashboard/product-health/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isValidPeriod(value: string | null): value is Period {
  return value !== null && (VALID_PERIODS as readonly string[]).includes(value)
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getWebUser(request.headers)
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== AccountRole.Admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const periodParam = request.nextUrl.searchParams.get('period')
  if (periodParam !== null && !isValidPeriod(periodParam)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }
  const period: Period = periodParam ?? 'month'

  const productHealthResult = isProductHealthEnabled()
    ? parseProductHealthParams(request.nextUrl.searchParams)
    : null
  if (productHealthResult && !productHealthResult.ok) {
    return NextResponse.json({ error: productHealthResult.error }, { status: 400 })
  }

  const startedAt = Date.now()
  try {
    const [data, productHealth] = await Promise.all([
      computeDashboardMetrics(period),
      productHealthResult?.ok
        ? computeProductHealth(await getContentDb(), productHealthResult.params).catch(
            (err: unknown) => {
              logger.warn({ err }, 'dashboard-metrics: productHealth slice failed — omitting')
              return undefined as ProductHealthPayload | undefined
            },
          )
        : Promise.resolve(undefined),
    ])
    const durationMs = Date.now() - startedAt
    logger.info(
      { durationMs, period, userId: user.id, productHealth: Boolean(productHealth) },
      'dashboard-metrics: computed successfully',
    )
    const body = productHealth ? { ...data, productHealth } : data
    return NextResponse.json(body, {
      headers: {
        // no-store matches the repo's convention for auth-required endpoints
        // (see /api/health, /api/agent/chat/stream). Browser HTTP cache is
        // keyed by URL, not session, so a `private, max-age` header would
        // let a second browser user see the cached admin response after the
        // admin logged out. Server-Timing stays for perf verification.
        'Cache-Control': 'no-store',
        'Server-Timing': `total;dur=${durationMs}`,
      },
    })
  } catch (error) {
    logger.error(
      {
        err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        durationMs: Date.now() - startedAt,
        period,
      },
      'dashboard-metrics: aggregation failed',
    )
    return NextResponse.json({ error: 'Failed to compute metrics' }, { status: 500 })
  }
}
