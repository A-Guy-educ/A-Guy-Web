/**
 * First-touch landing attribution for the `guest-sessions` funnel.
 *
 * Runs in middleware (Edge) on the request that mints the guest cookie, so it
 * must stay dependency-free. Everything here is derived from the URL and the
 * Referer header — never the query string beyond the three UTM keys, never
 * the user agent, never the IP.
 *
 * Route patterns mirror `src/app/(frontend)`:
 * - lesson  → /courses/:course/chapters/:chapter/lessons/:lesson(/...)
 * - course  → /courses/:course and /courses/:course/chapters/:chapter
 * - start   → /start, plus /courses (middleware redirects anon visitors there)
 * - home    → / and /home
 * - other   → everything else (posts, products, /login redirects, ...)
 */

export type LandingType = 'lesson' | 'course' | 'start' | 'home' | 'other'

export const LANDING_TYPES: readonly LandingType[] = ['lesson', 'course', 'start', 'home', 'other']

export interface GuestLanding {
  landingPath: string
  landingType: LandingType
  referrerHost: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
}

const LESSON_PATH_RE = /^\/courses\/[^/]+\/chapters\/[^/]+\/lessons\/[^/]+(?:\/|$)/
const COURSE_PATH_RE = /^\/courses\/[^/]+(?:\/chapters\/[^/]+)?\/?$/

const MAX_PATH_LENGTH = 200
const MAX_UTM_LENGTH = 100

export function classifyLandingPath(pathname: string): LandingType {
  if (LESSON_PATH_RE.test(pathname)) return 'lesson'
  if (COURSE_PATH_RE.test(pathname)) return 'course'
  if (pathname === '/start' || pathname === '/courses') return 'start'
  if (pathname === '/' || pathname === '/home') return 'home'
  return 'other'
}

/**
 * External referrer host, or null for direct/internal traffic. Same-host
 * referrers mean the visitor was already on the site (e.g. cleared cookies),
 * which isn't an acquisition source.
 */
export function referrerHostOf(referer: string | null, currentHost: string): string | null {
  if (!referer) return null
  try {
    const host = new URL(referer).hostname.toLowerCase()
    const own = currentHost.split(':')[0]?.toLowerCase() ?? ''
    if (!host || host === own) return null
    return host.slice(0, MAX_PATH_LENGTH)
  } catch {
    return null
  }
}

function utmParam(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)?.trim()
  return value ? value.slice(0, MAX_UTM_LENGTH) : null
}

export function buildGuestLanding(
  url: URL,
  referer: string | null,
  currentHost: string,
): GuestLanding {
  const landingPath = url.pathname.slice(0, MAX_PATH_LENGTH)
  return {
    landingPath,
    landingType: classifyLandingPath(url.pathname),
    referrerHost: referrerHostOf(referer, currentHost),
    utmSource: utmParam(url.searchParams, 'utm_source'),
    utmMedium: utmParam(url.searchParams, 'utm_medium'),
    utmCampaign: utmParam(url.searchParams, 'utm_campaign'),
  }
}

function nullableString(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.length > 0 ? value.slice(0, max) : null
}

/**
 * Re-validate a landing payload received over the signed loopback. The HMAC
 * already proves middleware sent it; this just guarantees the DB only ever
 * sees the documented shape.
 */
export function parseGuestLanding(value: unknown): GuestLanding | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const landingPath = nullableString(raw.landingPath, MAX_PATH_LENGTH)
  if (!landingPath?.startsWith('/')) return null
  return {
    landingPath,
    landingType: classifyLandingPath(landingPath),
    referrerHost: nullableString(raw.referrerHost, MAX_PATH_LENGTH),
    utmSource: nullableString(raw.utmSource, MAX_UTM_LENGTH),
    utmMedium: nullableString(raw.utmMedium, MAX_UTM_LENGTH),
    utmCampaign: nullableString(raw.utmCampaign, MAX_UTM_LENGTH),
  }
}
