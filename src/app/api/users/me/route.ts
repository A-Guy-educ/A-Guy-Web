import { NextRequest, NextResponse } from 'next/server'

import {
  appendAuthCookieClearHeaders,
  getSessionFromHeaders,
  tokensFromHeaders,
} from '@/infra/auth/web-auth'

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
  return NextResponse.json({ user: session.user })
}
