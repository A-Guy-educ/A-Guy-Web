/**
 * POST /api/internal/guest-session/create
 *
 * Internal endpoint the middleware calls (via `after()`) to record an
 * anonymous first-touch. Runs on Node so it can touch Mongo directly.
 *
 * Body: `{ sessionId, landing }` — `landing` is the first-touch attribution
 * middleware derived from the request URL + Referer (see guest-landing.ts).
 *
 * Auth: HMAC over the raw body with PAYLOAD_SECRET, sent as `x-signature`.
 * The route is on the public /api surface so signature verification is the
 * only thing preventing arbitrary callers from inflating the funnel — same
 * shape as a signed webhook.
 */

import { NextRequest, NextResponse } from 'next/server'

import { parseGuestLanding } from '@/infra/analytics/guest-landing'
import { isValidGuestSessionId } from '@/infra/analytics/guest-session-cookie'
import { verifySignedLoopback } from '@/infra/analytics/guest-session-loopback'
import { logger } from '@/infra/utils/logger/logger'
import { recordGuestSession } from '@/server/services/guest-sessions/guest-session-writer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) {
    logger.warn('guest-session/create: PAYLOAD_SECRET missing')
    return new NextResponse(null, { status: 500 })
  }

  const result = await verifySignedLoopback(request, secret)
  if (!result.ok) return new NextResponse(null, { status: result.status })

  const body = result.body as { sessionId?: unknown; landing?: unknown } | null
  const sessionId = body?.sessionId
  if (typeof sessionId !== 'string' || !isValidGuestSessionId(sessionId)) {
    return new NextResponse(null, { status: 400 })
  }

  await recordGuestSession(sessionId, parseGuestLanding(body?.landing))
  return new NextResponse(null, { status: 204 })
}
