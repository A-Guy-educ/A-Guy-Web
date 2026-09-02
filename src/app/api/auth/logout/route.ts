import { NextRequest, NextResponse } from 'next/server'

import {
  appendAuthCookieClearHeaders,
  revokeSession,
  tokensFromHeaders,
} from '@/infra/auth/web-auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest): Promise<NextResponse> {
  // public endpoint: logout only revokes the caller's own session(s)
  // Revoke every token the browser sent — a stale cookie variant left behind
  // by an earlier deploy is still a live DB session until it is pulled.
  await Promise.all(tokensFromHeaders(request.headers).map(revokeSession))

  const res = NextResponse.json({ success: true })
  appendAuthCookieClearHeaders(res.headers)
  return res
}
