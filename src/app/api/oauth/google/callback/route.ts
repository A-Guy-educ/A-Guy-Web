import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { classifySignupSource } from '@/infra/analytics/classify-signup-source'
import { GUEST_SESSION_COOKIE, isValidGuestSessionId } from '@/infra/analytics/guest-session-cookie'
import {
  SIGNUP_SOURCE_COOKIE,
  parseSignupSourceCookie,
} from '@/infra/analytics/signup-source-cookie'
import { logOAuthError, logOAuthEvent } from '@/infra/auth/oauth_logger'
import { validateOAuthState } from '@/infra/auth/oauth_state'
import { getPublicBaseUrl } from '@/infra/auth/oauth_url'
import {
  createGoogleUser,
  createSession,
  findUserByEmail,
  findUserByGoogleSub,
  linkGoogleUser,
  setAuthCookie,
  type GoogleUserAttribution,
} from '@/infra/auth/web-auth'
import { sanitizeReturnTo } from '@/infra/auth/oauth_sanitize'
import { getSharedLoginPolicy } from '@/infra/auth/shared-login/policy.env'
import { getOnboardingRedirect, START_WIZARD_COMPLETED_COOKIE } from '@/infra/onboarding/redirect'
import { claimGuestSession } from '@/server/services/guest-sessions/guest-session-writer'

const googleUserSchema = z.object({
  sub: z.string().min(1),
  email: z
    .string()
    .email()
    .transform((email) => email.toLowerCase()),
  email_verified: z.literal(true),
  name: z.string().optional(),
  picture: z.string().optional(),
})

export const runtime = 'nodejs'

export async function GET(req: NextRequest): Promise<NextResponse> {
  // public endpoint: OAuth callback validates provider state before creating a session
  const res = new NextResponse(null, { status: 302 })
  const correlationId = crypto.randomUUID()
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const { valid, returnTo } = validateOAuthState(req, res, state)
  const wizardCompleted = req.cookies.get(START_WIZARD_COMPLETED_COOKIE)?.value === '1'

  if (!valid || !code) {
    res.headers.set('Location', new URL('/login?error=auth_error', req.url).toString())
    return res
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${getPublicBaseUrl(req)}/api/oauth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = (await tokenResponse.json()) as { access_token?: string }
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error('token_exchange_failed')

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const google = googleUserSchema.parse(await userResponse.json())

    const byGoogle = await findUserByGoogleSub(google.sub)
    const byEmail = byGoogle ? null : await findUserByEmail(google.email)
    const isNewUser = !byGoogle && !byEmail
    // Attribution is captured on first landing and only stamped when we
    // actually create a new user — existing-user logins never touch these
    // fields so a first touch keeps its original bucket.
    const attribution = isNewUser ? readSignupAttribution(req) : null
    const user = byGoogle ?? byEmail ?? (await createGoogleUser(google, attribution ?? undefined))
    if (!user) throw new Error('user_not_found')
    if (!byGoogle) await linkGoogleUser(user, google)
    if (isNewUser) {
      clearSignupSourceCookie(res)
      await claimGuestSessionForNewUser(req, res, String(user._id))
    }

    const { token } = await createSession(user)
    setAuthCookie(res, token, req.headers)
    await logOAuthEvent(isNewUser ? 'user_created' : 'session_issued', {
      correlationId,
      userId: String(user._id),
      googleSub: google.sub,
    })

    // Re-sanitized rather than trusted: `returnTo` comes back from a cookie,
    // and the policy may have changed since the handshake began.
    const safeReturnTo = sanitizeReturnTo(returnTo, getSharedLoginPolicy())
    const destination = isNewUser
      ? getOnboardingRedirect(safeReturnTo, { skipPersona: wizardCompleted })
      : safeReturnTo

    res.headers.set('Location', new URL(destination, req.url).toString())
    return res
  } catch (error) {
    logOAuthError('callback_failed', error, correlationId)
    res.headers.set('Location', new URL('/login?error=auth_error', req.url).toString())
    return res
  }
}

function readSignupAttribution(req: NextRequest): GoogleUserAttribution | null {
  const raw = req.cookies.get(SIGNUP_SOURCE_COOKIE)?.value
  const payload = parseSignupSourceCookie(raw)
  if (!payload) return null
  return {
    signupSource: classifySignupSource(payload.referrer, req.nextUrl.hostname),
    utmSource: payload.utmSource,
    utmMedium: payload.utmMedium,
    utmCampaign: payload.utmCampaign,
  }
}

function clearSignupSourceCookie(res: NextResponse): void {
  res.cookies.set(SIGNUP_SOURCE_COOKIE, '', { path: '/', maxAge: 0 })
}

/**
 * Link the guest-sessions row this visitor accumulated pre-signup to the new
 * user. Clears the cookie so the same row isn't re-claimed on the next login
 * (or, worse, claimed by a different account sharing the browser).
 */
async function claimGuestSessionForNewUser(
  req: NextRequest,
  res: NextResponse,
  userId: string,
): Promise<void> {
  const sessionId = req.cookies.get(GUEST_SESSION_COOKIE)?.value
  if (!isValidGuestSessionId(sessionId)) return
  await claimGuestSession(sessionId, userId)
  res.cookies.set(GUEST_SESSION_COOKIE, '', { path: '/', maxAge: 0 })
}
