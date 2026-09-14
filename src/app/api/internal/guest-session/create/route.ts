/**
 * POST /api/internal/guest-session/create
 *
 * Internal endpoint the middleware calls (via `after()`) to record an
 * anonymous first-touch. Runs on Node so it can touch Mongo directly.
 *
 * Auth: HMAC over the sessionId with PAYLOAD_SECRET, sent as `x-signature`.
 * The route is on the public /api surface so signature verification is the
 * only thing preventing arbitrary callers from inflating the funnel.
 */

import { NextRequest, NextResponse } from 'next/server'

import { isValidGuestSessionId } from '@/infra/analytics/guest-session-cookie'
import { signGuestSessionId, timingSafeEqualHex } from '@/infra/analytics/guest-session-signing'
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

  const signature = request.headers.get('x-signature')
  if (!signature) return new NextResponse(null, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  const sessionId = (body as { sessionId?: unknown } | null)?.sessionId
  if (typeof sessionId !== 'string' || !isValidGuestSessionId(sessionId)) {
    return new NextResponse(null, { status: 400 })
  }

  const expected = await signGuestSessionId(sessionId, secret)
  if (!timingSafeEqualHex(signature, expected)) {
    return new NextResponse(null, { status: 401 })
  }

  await recordGuestSession(sessionId)
  return new NextResponse(null, { status: 204 })
}
