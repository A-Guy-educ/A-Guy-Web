/**
 * POST /api/funnel-events — browser beacon for what happens on upgrade walls
 * that only exist client-side: the wall shown (free-tier exercise lock, AI
 * quota card), "continue without", and a plan picked (on a wall or on
 * /subscriptions). Server-side steps (lesson redirect, pricing page,
 * checkout) record directly via the service.
 *
 * A body without `type` is a `paywall_shown` (the original beacon shape,
 * still sent by tabs opened before this route took other events).
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { getWebUser } from '@/infra/web-api/mongo-payload'
import { TIER_SLUGS } from '@/lib/tiers'
import { PAYWALL_GATES, recordFunnelEvent } from '@/server/services/funnel-events'

const gate = z.enum(PAYWALL_GATES)

const BodySchema = z.preprocess(
  (body) =>
    body && typeof body === 'object' && !('type' in body)
      ? { ...body, type: 'paywall_shown' }
      : body,
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('paywall_shown'), gate, path: z.string().max(300).optional() }),
    z.object({ type: z.literal('paywall_dismissed'), gate }),
    z.object({
      type: z.literal('plan_selected'),
      tier: z.enum(TIER_SLUGS),
      gate: gate.nullable().optional(),
    }),
  ]),
)

export async function POST(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  await recordFunnelEvent({ ...parsed.data, userId: user.id })
  return Response.json({ success: true })
}
