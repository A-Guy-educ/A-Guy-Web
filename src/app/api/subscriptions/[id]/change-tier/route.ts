/**
 * Change Tier — PATCH /api/subscriptions/:id/change-tier
 *
 * Mid-cycle tier upgrade on an active subscription. Thin proxy to admin's
 * `PATCH /api/subscriptions/:id/change-tier`, which swaps the STO's recurring
 * price in place and flips the user's `currentTier` immediately. Downgrades
 * aren't supported yet — admin returns 400 for those.
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
  tierSlug: z.enum(['basic', 'advanced', 'premium']),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Early auth gate — admin re-checks ownership, but short-circuit here.
  const user = await getWebUser(request.headers)
  if (!user?.id) {
    return NextResponse.json({ success: false, error: 'authentication_required' }, { status: 401 })
  }

  const { id } = await params
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ success: false, error: 'missing_subscription_id' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'invalid_tier' }, { status: 400 })
  }

  try {
    const admin = await fetchAdminApi(`/api/subscriptions/${encodeURIComponent(id)}/change-tier`, {
      method: 'PATCH',
      requestHeaders: request.headers,
      body: { tierSlug: parsed.data.tierSlug },
    })
    return NextResponse.json(admin.json ?? { success: false, error: 'change_tier_failed' }, {
      status: admin.status,
    })
  } catch (err) {
    logger.error(
      {
        err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
        subscriptionId: id,
        tierSlug: parsed.data.tierSlug,
      },
      'Subscription change-tier: admin proxy failed',
    )
    return NextResponse.json({ success: false, error: 'change_tier_failed' }, { status: 500 })
  }
}
