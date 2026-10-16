/**
 * Subscription Test Checkout — POST /api/subscriptions/test-checkout
 *
 * Proxies admin's subscription-bootstrap endpoint with the dedicated test
 * offerSlug (`basic.test` = 1 ILS, non-prod only). Backs the `/subtest`
 * smoke-test page so we can walk the full real-subscription flow (bootstrap
 * → Subscription row → activeSubscription virtual → renewal cron → cancel)
 * for 1 ILS instead of 33+ ILS.
 *
 * Admin returns 400 on prod-env test-offer requests (gated via
 * NODE_ENV === 'production'), so a leaked /subtest link can't ride into prod.
 *
 * Delete this route and the `/subtest` page once real-subscription testing
 * is wrapped up.
 *
 * @fileType route
 * @domain billing
 */

import { NextRequest, NextResponse } from 'next/server'

import { getWebUser } from '@/infra/web-api/mongo-payload'
import { logger } from '@/infra/utils/logger/logger'
import { fetchAdminApi } from '@/server/services/admin-api'

export async function POST(request: NextRequest) {
  // Early auth gate — admin re-checks, but short-circuit here so unauth
  // callers don't eat the cross-origin round trip.
  const user = await getWebUser(request.headers)
  if (!user?.id) {
    return NextResponse.json({ success: false, error: 'authentication_required' }, { status: 401 })
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
        tierSlug: 'basic',
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
      },
      'Subscription test checkout: admin proxy failed',
    )
    return NextResponse.json({ success: false, error: 'checkout_failed' }, { status: 500 })
  }
}
