/**
 * Subscription Checkout — POST /api/subscriptions/checkout
 *
 * Thin server-side proxy to Admin's subscription-bootstrap endpoint
 * (`POST /api/subscriptions/bootstrap/tranzilla`). Web no longer owns the
 * Subscription row, the Transaction row, the Tranzilla URL build, or the
 * tier price — Admin resolves all of that from `(tierSlug, offerSlug)` using
 * its own pricing constants and returns a Tranzilla checkout URL to redirect
 * the buyer to.
 *
 * Request body:
 *   { tier: 'basic'|'advanced'|'premium', offerSlug?: 'default'|'intro3mo' }
 * Response: { success, checkoutUrl, subscriptionId, transactionId }
 *
 * The browser calls this web route instead of hitting Admin directly because
 * Admin's CORS allowlist doesn't include `dev.aguy.co.il` — see
 * `src/server/services/admin-api.ts` for the forwarding details.
 *
 * @fileType route
 * @domain billing
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { logger } from '@/infra/utils/logger/logger'
import { fetchAdminApi } from '@/server/services/admin-api'

const BodySchema = z.object({
  tier: z.enum(['basic', 'advanced', 'premium']),
  offerSlug: z.enum(['default', 'intro3mo']).default('default'),
})

export async function POST(request: NextRequest) {
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
        offerSlug: parsed.data.offerSlug,
        successUrl: `${baseUrl}/checkout/success`,
        cancelUrl: `${baseUrl}/subscriptions`,
      },
    })
    // Pass Admin's status + body through verbatim so the client sees the
    // real auth / validation / conflict codes (401 / 400 / 409 / etc.) and
    // can surface the specific error key.
    return NextResponse.json(admin.json ?? { success: false, error: 'checkout_failed' }, {
      status: admin.status,
    })
  } catch (err) {
    logger.error(
      {
        err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
        tier: parsed.data.tier,
        offerSlug: parsed.data.offerSlug,
      },
      'Subscription checkout: admin proxy failed',
    )
    return NextResponse.json({ success: false, error: 'checkout_failed' }, { status: 500 })
  }
}
