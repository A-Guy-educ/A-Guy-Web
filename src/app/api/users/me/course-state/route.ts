import { NextRequest, NextResponse } from 'next/server'

import { requireUser } from '@/server/auth/api-auth'
import { logger } from '@/infra/utils/logger/logger'

export const runtime = 'nodejs'

/**
 * Web-side proxy for Admin's `PATCH /api/users/me/course-state`.
 *
 * Web users authenticate against Web, not Admin — their browser has no Admin
 * cookie to send cross-origin, so a direct client-to-Admin PATCH always 401s.
 * This route bridges the gap: Web verifies its own session (knows who is
 * calling), then vouches for the user id to Admin using the shared
 * `ADMIN_SERVICE_TOKEN`. Admin trusts the token, never the client.
 *
 * Same-origin from the browser, so no CORS or cross-site cookie concerns.
 * Called from the three client triggers in `currentCourseSync.ts`.
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL
  const serviceToken = process.env.ADMIN_SERVICE_TOKEN
  if (!adminUrl || !serviceToken) {
    // Misconfiguration — fail closed but do not leak which piece is missing
    // to the client. Do log the exact gap for ops. Token length only (never
    // the value) so a bad paste is visible without leaking the secret.
    logger.error(
      {
        adminUrlSet: Boolean(adminUrl),
        serviceTokenSet: Boolean(serviceToken),
        serviceTokenLength: serviceToken?.length ?? 0,
      },
      'course-state proxy: missing env config',
    )
    return NextResponse.json({ success: false, error: 'Service unavailable' }, { status: 503 })
  }

  let clientBody: { currentCourse?: unknown } = {}
  try {
    clientBody = (await request.json()) as { currentCourse?: unknown }
  } catch {
    // Empty body is valid (refresh lastLoginAt only) — carry on with defaults.
  }

  const forwardBody: Record<string, string> = { userId: auth.value.id }
  if (typeof clientBody.currentCourse === 'string' && clientBody.currentCourse.length > 0) {
    forwardBody.currentCourse = clientBody.currentCourse
  }

  try {
    const adminResponse = await fetch(`${adminUrl}/api/users/me/course-state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-service-token': serviceToken,
      },
      body: JSON.stringify(forwardBody),
    })

    // Mirror Admin's response verbatim so client-side handling stays uniform
    // regardless of whether the call went via proxy or directly.
    const text = await adminResponse.text()
    return new NextResponse(text, {
      status: adminResponse.status,
      headers: { 'content-type': adminResponse.headers.get('content-type') ?? 'application/json' },
    })
  } catch (error) {
    // Log the underlying cause so 502s surface a real reason in Vercel
    // function logs (URL parse fail, invalid header value from a stray
    // newline in ADMIN_SERVICE_TOKEN, network error, etc.). The token
    // itself is never logged; length only, to reveal a bad paste.
    logger.error(
      {
        err: error instanceof Error ? { name: error.name, message: error.message } : error,
        adminUrlPrefix: adminUrl.slice(0, 40),
        serviceTokenLength: serviceToken.length,
      },
      'course-state proxy: upstream fetch threw',
    )
    return NextResponse.json({ success: false, error: 'Upstream unreachable' }, { status: 502 })
  }
}
