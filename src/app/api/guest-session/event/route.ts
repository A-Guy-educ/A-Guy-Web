/**
 * POST /api/guest-session/event
 *
 * Client beacon for anonymous visitors: JS confirmation (bot heuristic) and
 * onboarding funnel steps. Keyed exclusively by the httpOnly
 * `guest_session_id` cookie — the body never names a session, so a caller
 * can only stamp its own row. No cookie or an unknown session → no-op.
 *
 * Writes are first-write-wins and never upsert, so replaying a beacon can't
 * inflate any count. The cookie is SameSite=Lax, so cross-site POSTs arrive
 * without it and are ignored.
 *
 * Response: `{ recorded: boolean }` — false lets the JS beacon retry on a
 * later page load if it raced the middleware insert.
 */

import { NextRequest, NextResponse } from 'next/server'

import { GuestSessionEventSchema } from '@/infra/analytics/guest-session-event-contract'
import { GUEST_SESSION_COOKIE, isValidGuestSessionId } from '@/infra/analytics/guest-session-cookie'
import { recordGuestSessionEvent } from '@/server/services/guest-sessions/guest-session-events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NOT_RECORDED = { recorded: false } as const

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sessionId = request.cookies.get(GUEST_SESSION_COOKIE)?.value
  if (!isValidGuestSessionId(sessionId)) return NextResponse.json(NOT_RECORDED)

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const parsed = GuestSessionEventSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid event' }, { status: 400 })

  const recorded = await recordGuestSessionEvent(sessionId, parsed.data)
  return NextResponse.json({ recorded })
}
