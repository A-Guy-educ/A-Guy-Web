/**
 * Subscription Test Checkout — POST /api/subscriptions/test-checkout
 *
 * Proxies admin's subscription-bootstrap endpoint with the dedicated test
 * offerSlug (`basic.test` ₪0.01 / `advanced.test` ₪0.02 / `premium.test`
 * ₪0.03 — all non-prod only via admin's VERCEL_ENV gate). Backs the
 * `/subtest` page's full subscribe matrix so Shai can hit every tier
 * cheaply end-to-end.
 *
 * Admin returns 400 on prod-env test-offer requests (gated via
 * `isOfferAllowedForEnvironment`), so a leaked /subtest link can't ride
 * into prod.
 *
 * Delete this route and `/subtest` once real-subscription testing wraps up.
 *
 * @fileType route
 * @domain billing
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getWebUser } from '@/infra/web-api/mongo-payload'
import { logger } from '@/infra/utils/logger/logger'
import { fetchAdminApi } from '@/server/services/admin-api'

const BodySchema = z.object({
  tier: z.enum(['basic', 'advanced', 'premium']),
})

export async function POST(request: NextRequest) {
  // Early auth gate — admin re-checks, but short-circuit here so unauth
  // callers don't eat the cross-origin round trip.
  const user = await getWebUser(request.headers)
  if (!user?.id) {
    return NextResponse.json({ success: false, error: 'authentication_required' }, { status: 401 })
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'invalid_tier' }, { status: 400 })
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    new URL(request.url).origin

  try {
    const admin = await fetchAdminApi('/api/subscriptions/bootstrap/tranzilla', {
      method: 'POST',
      requestHeaders: request.headers,
      body: {
        tierSlug: parsed.data.tier,
        offerSlug: 'test',
        successUrl: `${baseUrl}/checkout/success`,
        cancelUrl: `${baseUrl}/subtest`,
      },
    })
    return NextResponse.json(admin.json ?? { success: false, error: 'checkout_failed' }, {
      status: admin.status,
    })
  } catch (err) {
    logger.error(
      {
        err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
        userId: user.id,
        tier: parsed.data.tier,
      },
      'Subscription test checkout: admin proxy failed',
    )
    return NextResponse.json({ success: false, error: 'checkout_failed' }, { status: 500 })
  }
}
