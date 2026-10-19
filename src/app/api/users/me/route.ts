import { NextRequest, NextResponse } from 'next/server'

import {
  appendAuthCookieClearHeaders,
  getSessionFromHeaders,
  tokensFromHeaders,
} from '@/infra/auth/web-auth'
import { readActiveSubscription } from '@/server/services/active-subscription-reader'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // public endpoint: returns anonymous state when no valid session exists
  const session = await getSessionFromHeaders(request.headers)
  if (!session) {
    // Every cookie variant the browser sent is stale: clear them all so the
    // next request hits the middleware login redirect instead of looping
    // through 401s while the UI thinks the user is signed in.
    const res = NextResponse.json({ user: null }, { status: 401 })
    if (tokensFromHeaders(request.headers).length > 0) {
      appendAuthCookieClearHeaders(res.headers)
    }
    return res
  }
  // Mirror admin's `attachActiveSubscription` afterRead hook — Web's
  // /api/users/me is a custom route (not Payload REST), so admin's Payload
  // hooks don't fire here. Without this the subscriptions UI on web can't
  // see the active subscription even after admin's bootstrap webhook has
  // written the row. Service short-circuits on no-sub users with a single
  // indexed Mongo lookup, so the cost on free users is negligible.
  const activeSubscription = await readActiveSubscription(session.user.id)

  return NextResponse.json({
    user: { ...session.user, activeSubscription },
  })
}
