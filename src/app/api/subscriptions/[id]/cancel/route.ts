/**
 * Cancel Subscription — PATCH /api/subscriptions/:id/cancel
 *
 * Thin proxy to Admin's `PATCH /api/subscriptions/:id/cancel`. Admin applies
 * soft-cancel semantics (status='cancelled', cancelAtPeriodEnd=true); access
 * continues until `currentPeriodEnd`, and the hourly admin cron handles the
 * expiry + downgrade.
 *
 * @fileType route
 * @domain billing
 */

import { NextRequest, NextResponse } from 'next/server'

import { getWebUser } from '@/infra/web-api/mongo-payload'
import { logger } from '@/infra/utils/logger/logger'
import { fetchAdminApi } from '@/server/services/admin-api'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Early auth gate — admin re-checks ownership via payload.auth(), but
  // bouncing unauth requests here avoids a cross-origin round trip.
  const user = await getWebUser(request.headers)
  if (!user?.id) {
    return NextResponse.json({ success: false, error: 'authentication_required' }, { status: 401 })
  }

  const { id } = await params
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ success: false, error: 'missing_subscription_id' }, { status: 400 })
  }

  try {
    const admin = await fetchAdminApi(`/api/subscriptions/${encodeURIComponent(id)}/cancel`, {
      method: 'PATCH',
      requestHeaders: request.headers,
    })
    return NextResponse.json(admin.json ?? { success: false, error: 'cancel_failed' }, {
      status: admin.status,
    })
  } catch (err) {
    logger.error(
      {
        err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
        subscriptionId: id,
      },
      'Subscription cancel: admin proxy failed',
    )
    return NextResponse.json({ success: false, error: 'cancel_failed' }, { status: 500 })
  }
}
