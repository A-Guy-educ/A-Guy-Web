/**
 * Shared constants + payload shape for the first-touch signup-source cookie.
 * Both the client-side capture (SignupSourceCapture) and the Google OAuth
 * callback read from these to avoid drift between writer and reader.
 */

export const SIGNUP_SOURCE_COOKIE = 'aguy_signup_source'

// 30 days in seconds — matches the "first touch stays sticky for a month"
// window in the spec.
export const SIGNUP_SOURCE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

export interface SignupSourcePayload {
  referrer: string
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  capturedAt: string
}

/**
 * Parse a raw cookie value written by SignupSourceCapture. Returns null on any
 * decode/parse failure or when required fields are missing — attribution is
 * best-effort, not load-bearing, so we never throw here.
 */
export function parseSignupSourceCookie(
  raw: string | undefined | null,
): SignupSourcePayload | null {
  if (!raw) return null
  try {
    const decoded = decodeURIComponent(raw)
    const parsed = JSON.parse(decoded) as Partial<SignupSourcePayload>
    if (typeof parsed.referrer !== 'string') return null
    return {
      referrer: parsed.referrer,
      utmSource: typeof parsed.utmSource === 'string' ? parsed.utmSource : null,
      utmMedium: typeof parsed.utmMedium === 'string' ? parsed.utmMedium : null,
      utmCampaign: typeof parsed.utmCampaign === 'string' ? parsed.utmCampaign : null,
      capturedAt: typeof parsed.capturedAt === 'string' ? parsed.capturedAt : '',
    }
  } catch {
    return null
  }
}
