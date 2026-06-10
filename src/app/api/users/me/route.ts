import { NextRequest, NextResponse } from 'next/server'

import { getSessionFromToken, tokenFromHeaders } from '@/infra/auth/web-auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await getSessionFromToken(tokenFromHeaders(request.headers))
  if (!session) return NextResponse.json({ user: null }, { status: 401 })
  return NextResponse.json({ user: session.user })
}
