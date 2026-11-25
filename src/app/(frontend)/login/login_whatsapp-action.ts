'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'

import { classifySignupSource } from '@/infra/analytics/classify-signup-source'
import { GUEST_SESSION_COOKIE, isValidGuestSessionId } from '@/infra/analytics/guest-session-cookie'
import {
  SIGNUP_SOURCE_COOKIE,
  parseSignupSourceCookie,
} from '@/infra/analytics/signup-source-cookie'
import { sanitizeReturnTo, type SafeDestination } from '@/infra/auth/oauth_sanitize'
import { getRequestHeadersSafe } from '@/infra/auth/request-headers'
import { getSharedLoginPolicy } from '@/infra/auth/shared-login/policy.env'
import { createSession, setAuthCookie, type GoogleUserAttribution } from '@/infra/auth/web-auth'
import { getOnboardingRedirect, START_WIZARD_COMPLETED_COOKIE } from '@/infra/onboarding/redirect'
import { logger } from '@/infra/utils/logger'
import { claimGuestSession } from '@/server/services/guest-sessions/guest-session-writer'
import {
  requestWhatsAppLoginCode,
  verifyWhatsAppLoginCode,
} from '@/server/services/whatsapp-login/whatsapp-login'

type ReadableHeaders = NonNullable<Awaited<ReturnType<typeof getRequestHeadersSafe>>>

export type WhatsAppSendError = 'invalidPhone' | 'rateLimited' | 'sendFailed'
export type WhatsAppVerifyError =
  'invalidPhone' | 'invalidCode' | 'expiredCode' | 'rateLimited' | 'unexpected'

const sendSchema = z.object({ phone: z.string().min(1).max(32) })
const verifySchema = z.object({
  phone: z.string().min(1).max(32),
  code: z.string().min(1).max(12),
  returnTo: z.string().max(2048).optional(),
})

/**
 * Vercel sets `x-forwarded-for` itself, so its first hop is the client. The
 * fallback only matters locally, where every request shares one bucket.
 */
function clientIp(headers: ReadableHeaders | undefined): string {
  const forwarded = headers?.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || headers?.get('x-real-ip') || 'unknown'
}

export async function sendWhatsAppCodeAction(
  input: z.infer<typeof sendSchema>,
): Promise<{ success: true } | { success: false; error: WhatsAppSendError }> {
  const parsed = sendSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'invalidPhone' }

  try {
    const result = await requestWhatsAppLoginCode({
      phone: parsed.data.phone,
      ip: clientIp(await getRequestHeadersSafe()),
    })
    return result.ok ? { success: true } : { success: false, error: result.error }
  } catch (error) {
    logger.error({ err: error }, 'WhatsApp code request failed')
    return { success: false, error: 'sendFailed' }
  }
}

export async function verifyWhatsAppCodeAction(
  input: z.infer<typeof verifySchema>,
): Promise<
  { success: true; destination: SafeDestination } | { success: false; error: WhatsAppVerifyError }
> {
  const parsed = verifySchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'invalidCode' }

  try {
    const headers = await getRequestHeadersSafe()
    const store = await cookies()
    const result = await verifyWhatsAppLoginCode({
      phone: parsed.data.phone,
      code: parsed.data.code,
      ip: clientIp(headers),
      attribution: readSignupAttribution(store, headers) ?? undefined,
    })
    if (!result.ok) return { success: false, error: result.error }

    const { user, isNewUser } = result
    const { token } = await createSession(user)
    setAuthCookie({ cookies: store }, token, headers)

    if (isNewUser) {
      store.set(SIGNUP_SOURCE_COOKIE, '', { path: '/', maxAge: 0 })
      const guestSessionId = store.get(GUEST_SESSION_COOKIE)?.value
      if (isValidGuestSessionId(guestSessionId)) {
        await claimGuestSession(guestSessionId, String(user._id))
        store.set(GUEST_SESSION_COOKIE, '', { path: '/', maxAge: 0 })
      }
    }

    // The client hands back what the page gave it, but anything arriving at a
    // server action is untrusted — sanitize again against the live policy.
    const safeReturnTo = sanitizeReturnTo(parsed.data.returnTo, getSharedLoginPolicy())
    const destination = isNewUser
      ? getOnboardingRedirect(safeReturnTo, {
          skipPersona: store.get(START_WIZARD_COMPLETED_COOKIE)?.value === '1',
        })
      : safeReturnTo
    return { success: true, destination }
  } catch (error) {
    logger.error({ err: error }, 'WhatsApp login failed')
    return { success: false, error: 'unexpected' }
  }
}

/** Same first-touch attribution the Google callback stamps on new accounts. */
function readSignupAttribution(
  store: Awaited<ReturnType<typeof cookies>>,
  headers: ReadableHeaders | undefined,
): GoogleUserAttribution | null {
  const payload = parseSignupSourceCookie(store.get(SIGNUP_SOURCE_COOKIE)?.value)
  if (!payload) return null
  const host = headers?.get('host')?.split(':')[0]
  return {
    signupSource: classifySignupSource(payload.referrer, host),
    utmSource: payload.utmSource,
    utmMedium: payload.utmMedium,
    utmCampaign: payload.utmCampaign,
  }
}
