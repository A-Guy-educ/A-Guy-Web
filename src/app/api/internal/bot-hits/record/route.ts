/**
 * POST /api/internal/bot-hits/record
 *
 * Internal endpoint the middleware calls (via `after()`) when a page load
 * comes from a UA-detected bot. Bumps the daily per-category counter; bots
 * never get a guest session.
 *
 * Body: `{ category }`. Auth: HMAC over the raw body with PAYLOAD_SECRET,
 * sent as `x-signature` — same contract as /api/internal/guest-session/create.
 */

import { NextRequest, NextResponse } from 'next/server'

import { isBotCategory } from '@/infra/analytics/bot-user-agent'
import { verifySignedLoopback } from '@/infra/analytics/guest-session-loopback'
import { logger } from '@/infra/utils/logger/logger'
import { incrementBotHit } from '@/server/services/guest-sessions/bot-hits-writer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) {
    logger.warn('bot-hits/record: PAYLOAD_SECRET missing')
    return new NextResponse(null, { status: 500 })
  }

  const result = await verifySignedLoopback(request, secret)
  if (!result.ok) return new NextResponse(null, { status: result.status })

  const category = (result.body as { category?: unknown } | null)?.category
  if (!isBotCategory(category)) return new NextResponse(null, { status: 400 })

  await incrementBotHit(category)
  return new NextResponse(null, { status: 204 })
}
