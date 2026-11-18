/**
 * POST /api/funnel-events — browser beacon for upgrade walls that only exist
 * client-side (free-tier exercise lock, AI quota card). Server-side steps
 * (lesson redirect, pricing page, checkout) record directly via the service.
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { getWebUser } from '@/infra/web-api/mongo-payload'
import { PAYWALL_GATES, recordFunnelEvent } from '@/server/services/funnel-events'

const BodySchema = z.object({
  gate: z.enum(PAYWALL_GATES),
  path: z.string().max(300).optional(),
})

export async function POST(request: NextRequest) {
  const user = await getWebUser(request.headers)
  if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  await recordFunnelEvent({
    type: 'paywall_shown',
    userId: user.id,
    gate: parsed.data.gate,
    path: parsed.data.path,
  })
  return Response.json({ success: true })
}
