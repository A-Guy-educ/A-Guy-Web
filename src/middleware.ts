import { NextRequest, NextResponse, after } from 'next/server'
import {
  cookieName,
  defaultLocale,
  type Locale,
  locales,
  getLocaleFromSubdomain,
} from './i18n/config'
import {
  type BotCategory,
  categorizeBotUserAgent,
  isBotUserAgent,
} from './infra/analytics/bot-user-agent'
import { buildGuestLanding, type GuestLanding } from './infra/analytics/guest-landing'
import {
  GUEST_SESSION_COOKIE,
  GUEST_SESSION_MAX_AGE_SECONDS,
  NEW_GUEST_SESSION_HEADER,
} from './infra/analytics/guest-session-cookie'
import { signGuestPayload } from './infra/analytics/guest-session-signing'
import { AUTH_COOKIE_NAME } from './infra/auth/shared-login/auth-cookie'
import { toCookieDomain } from './infra/auth/shared-login/policy'
import { getSharedLoginPolicy } from './infra/auth/shared-login/policy.env'
import { contentSecurityPolicy } from './infra/security/content-security-policy.js'
import {
  applyCorsHeaders,
  applyPreflightHeaders,
  resolveAllowedApiOrigin,
} from './infra/security/cors'

/**
 * Check if a path is a protected learning route that requires authentication.
 */
function isProtectedLearningPath(pathname: string): boolean {
  const protectedPaths = ['/study', '/practice', '/test', '/ask']
  for (const protectedPath of protectedPaths) {
    if (pathname === protectedPath || pathname.startsWith(`${protectedPath}/`)) {
      return true
    }
  }

  return false
}

function isCourseCatalogPath(pathname: string): boolean {
  return pathname === '/courses'
}

/**
 * Check if the request has a valid Payload auth token.
 * Checks for the payload-token cookie.
 */
function hasAuthToken(request: NextRequest): boolean {
  return request.cookies.get(AUTH_COOKIE_NAME)?.value !== undefined
}

/**
 * Attach CORS headers for sibling apps, and answer their preflight.
 *
 * Returns a response only for a preflight, which must not fall through to the
 * route. Otherwise the headers are added to `response` and the request
 * continues normally.
 */
function handleApiCors(request: NextRequest, response: NextResponse): NextResponse | undefined {
  const allowedOrigin = resolveAllowedApiOrigin(
    request.headers.get('origin'),
    getSharedLoginPolicy(),
  )
  if (!allowedOrigin) return undefined

  if (request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 })
    applyCorsHeaders(preflight.headers, allowedOrigin)
    applyPreflightHeaders(preflight.headers, request.headers.get('access-control-request-headers'))
    return preflight
  }

  applyCorsHeaders(response.headers, allowedOrigin)
  return undefined
}

function isKodyFlyPreviewHost(host: string): boolean {
  const hostname = host.split(':')[0]?.toLowerCase() ?? ''
  return hostname.startsWith('kp-') && hostname.endsWith('.fly.dev')
}

function isPublicApiHost(host: string): boolean {
  const hostname = host.split(':')[0]?.toLowerCase() ?? ''
  return hostname === (process.env.API_PUBLIC_HOST || 'api.aguy.co.il').toLowerCase()
}

function apiHostResponse(pathname: string): NextResponse | undefined {
  if (pathname.startsWith('/api')) return undefined

  const isHealthRequest = pathname === '/'
  return NextResponse.json(
    isHealthRequest ? { service: 'A-Guy API', status: 'ok' } : { error: 'Not found' },
    {
      status: isHealthRequest ? 200 : 404,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Security-Policy': contentSecurityPolicy,
      },
    },
  )
}

function allowsPreviewAuthBypass(request: NextRequest): boolean {
  if (process.env.KODY_PREVIEW_AUTH_BYPASS !== 'true') return false

  const host = request.headers.get('host') || request.nextUrl.host
  return isKodyFlyPreviewHost(host)
}

/**
 * Cookie `Domain` for the locale cookie.
 *
 * Prefers the configured root domain — the same value that scopes the auth
 * cookie — and otherwise guesses the apex from the host. The guess is safe
 * enough for a language preference but deliberately not reused for the session
 * cookie, where a wrong guess would leak a login: `toCookieDomain` only ever
 * honours explicit configuration.
 */
function resolveLocaleCookieDomain(host: string): string | undefined {
  const configured = toCookieDomain(process.env.ROOT_DOMAIN)
  if (configured) return configured

  const hostname = host.split(':')[0]
  if (!toCookieDomain(hostname)) return undefined

  const parts = hostname.split('.').filter(Boolean)
  if (parts.length < 2) return undefined

  return `.${parts.slice(-2).join('.')}`
}

// Media CDN redirects are handled by next.config.js redirects (baked in at build time).
// This avoids Edge middleware env var availability issues.

type AnonymousTouch =
  | { kind: 'guest'; sessionId: string; landing: GuestLanding }
  | { kind: 'bot'; category: BotCategory }

/**
 * Classify an anonymous page load for the guest funnel:
 * - `guest` → fresh human landing; mint a session id and capture attribution.
 * - `bot`   → UA-detected bot; counted in daily buckets, never a session.
 * Returns null when the caller is signed in, already has a guest cookie, or
 * is on a non-page path.
 */
function classifyAnonymousTouch(request: NextRequest, pathname: string): AnonymousTouch | null {
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/admin'))
    return null
  if (pathname.includes('.')) return null
  if (request.cookies.get(AUTH_COOKIE_NAME)) return null
  const userAgent = request.headers.get('user-agent')
  if (isBotUserAgent(userAgent)) return { kind: 'bot', category: categorizeBotUserAgent(userAgent) }
  if (request.cookies.get(GUEST_SESSION_COOKIE)) return null
  const host = request.headers.get('host') || request.nextUrl.host
  return {
    kind: 'guest',
    sessionId: crypto.randomUUID(),
    landing: buildGuestLanding(request.nextUrl, request.headers.get('referer'), host),
  }
}

interface GuestCookieAttrs {
  httpOnly: true
  sameSite: 'lax'
  secure: boolean
  path: string
  maxAge: number
}

function buildGuestSessionCookieAttrs(request: NextRequest): GuestCookieAttrs {
  const isHttps = request.nextUrl.protocol === 'https:'
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps || isProd,
    path: '/',
    maxAge: GUEST_SESSION_MAX_AGE_SECONDS,
  }
}

/**
 * Fire a DB write via a signed POST to an internal Node route. Middleware
 * runs on Edge so it can't call Mongo directly; the loopback fetch keeps the
 * write path off the layout, which was proving unreliable in production.
 * The signature covers the whole body so the payload can't be tampered with.
 */
async function postSignedLoopback(
  request: NextRequest,
  path: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) return
  try {
    const body = JSON.stringify(payload)
    const signature = await signGuestPayload(body, secret)
    await fetch(new URL(path, request.url), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-signature': signature,
      },
      body,
    })
  } catch {
    // Fire-and-forget analytics; a failed write must never break the request.
  }
}

/**
 * Schedule an analytics loopback after the response. `after()` throws outside
 * a request scope (unit tests, unexpected runtimes); analytics must never
 * break the page load, so a scheduling failure just drops the event.
 */
function scheduleLoopback(
  request: NextRequest,
  path: string,
  payload: Record<string, unknown>,
): void {
  try {
    after(() => postSignedLoopback(request, path, payload))
  } catch {
    // Dropped analytics event — see above.
  }
}

/**
 * Apply the newly-minted guest cookie to any response the middleware ends up
 * returning — including `NextResponse.redirect(...)` used for the anonymous
 * auth guards. Without this, an anon visitor whose first hit is a protected
 * route gets a redirect that discards the cookie set on the fallthrough
 * response, and we lose the entry-point signal entirely.
 */
function decorateWithGuestCookie(
  target: NextResponse,
  sessionId: string,
  attrs: GuestCookieAttrs,
): NextResponse {
  target.cookies.set(GUEST_SESSION_COOKIE, sessionId, attrs)
  return target
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || ''
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  // No downstream consumer today (the layout used to read this and fire the
  // insert itself). Strip anyway so nothing forged by a client leaks into
  // any future reader.
  requestHeaders.delete(NEW_GUEST_SESSION_HEADER)

  // Anonymous first-touch: mint a session id, set the cookie on whatever
  // response we return below (including redirects, via `applyGuestCookie`),
  // and fire the DB insert via a signed loopback to the Node route so the
  // write path doesn't depend on any downstream render.
  //
  // Skipped on the API host: those responses never carry the Set-Cookie
  // header, so the row would be orphaned and unclaimable.
  //
  // UA-detected bots get no cookie; they bump a daily per-category counter.
  const trackingHost = !isPublicApiHost(host)
  const anonymousTouch = trackingHost ? classifyAnonymousTouch(request, pathname) : null
  const newGuestSessionId = anonymousTouch?.kind === 'guest' ? anonymousTouch.sessionId : null

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const guestCookie = newGuestSessionId ? buildGuestSessionCookieAttrs(request) : null
  if (anonymousTouch?.kind === 'guest' && guestCookie) {
    response.cookies.set(GUEST_SESSION_COOKIE, anonymousTouch.sessionId, guestCookie)
    const { sessionId, landing } = anonymousTouch
    scheduleLoopback(request, '/api/internal/guest-session/create', { sessionId, landing })
  } else if (anonymousTouch?.kind === 'bot') {
    scheduleLoopback(request, '/api/internal/bot-hits/record', {
      category: anonymousTouch.category,
    })
  }

  if (!pathname.startsWith('/api/pdfjs-viewer')) {
    response.headers.set('Content-Security-Policy', contentSecurityPolicy)
  }

  if (isPublicApiHost(host)) {
    const apiOnlyResponse = apiHostResponse(pathname)
    if (apiOnlyResponse) return apiOnlyResponse
  }

  // Cross-origin API access for sibling apps that share the login cookie.
  // Without these headers the browser discards the response, even though the
  // cookie itself was sent (see docs/architecture/SHARED-LOGIN-APP-GUIDE.md).
  if (pathname.startsWith('/api')) {
    const corsResponse = handleApiCors(request, response)
    if (corsResponse) return corsResponse
  }

  // Exclude paths from locale handling (double safety, even though matcher already excludes many)
  const shouldExclude =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')

  if (shouldExclude) {
    return response
  }

  const applyGuestCookie = (redirect: NextResponse): NextResponse =>
    newGuestSessionId && guestCookie
      ? decorateWithGuestCookie(redirect, newGuestSessionId, guestCookie)
      : redirect

  // Auth guard: redirect unauthenticated users to login for protected learning routes
  if (
    isProtectedLearningPath(pathname) &&
    !hasAuthToken(request) &&
    !allowsPreviewAuthBypass(request)
  ) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('returnTo', `${pathname}${request.nextUrl.search}`)
    return applyGuestCookie(NextResponse.redirect(loginUrl))
  }

  if (isCourseCatalogPath(pathname) && !hasAuthToken(request)) {
    const startUrl = new URL('/start', request.url)
    return applyGuestCookie(NextResponse.redirect(startUrl))
  }

  // Course content pages (/courses/<slug>/...) are publicly viewable so Google
  // can crawl the lesson intros and visitors can preview before signing up.
  // Actual content gating still happens in-page via `AccessGateProvider`:
  // paid lessons render an empty gate shell for anon users, mandatory/gated
  // lessons render the intro behind a sign-in prompt. The middleware no longer
  // short-circuits with a hard login redirect.

  let locale: Locale = defaultLocale
  let shouldSetCookie = false

  // Subdomain-based locale forcing
  const subdomainLocale = getLocaleFromSubdomain(host)
  if (subdomainLocale) {
    locale = subdomainLocale
    shouldSetCookie = true
  } else {
    // On primary domain, check cookie first
    const cookieLocale = request.cookies.get(cookieName)?.value as Locale | undefined

    if (cookieLocale && locales.includes(cookieLocale)) {
      locale = cookieLocale
    }
  }

  if (shouldSetCookie) {
    const cookieDomain = resolveLocaleCookieDomain(host)
    const isHttps = request.nextUrl.protocol === 'https:'
    const isProd = process.env.NODE_ENV === 'production'

    // CHIPS: when this request is being served INSIDE a cross-origin
    // iframe (the Kody dashboard's preview pane is the prime example),
    // SameSite=Lax cookies are not written by modern browsers and the
    // user's language choice silently vanishes. Detect the embedded
    // context via Sec-Fetch-Site (browsers set this on every fetch) and
    // emit a Partitioned + SameSite=None + Secure cookie so it sticks.
    const fetchSite = request.headers.get('sec-fetch-site')
    const isCrossSiteEmbed = fetchSite === 'cross-site' && (isHttps || isProd)

    response.cookies.set(cookieName, locale, {
      maxAge: 31536000,
      path: '/',
      sameSite: isCrossSiteEmbed ? 'none' : 'lax',
      secure: isCrossSiteEmbed || isHttps || isProd,
      ...(isCrossSiteEmbed ? { partitioned: true } : {}),
      // Only set domain when it's safe/valid (custom domain).
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    })
  }

  // Set locale header for next-intl (or your own resolver)
  response.headers.set('x-locale', locale)

  return response
}

export const config = {
  matcher: [
    // Security headers run broadly; locale handling still exits early for admin/api/assets.
    '/((?!api/pdfjs-viewer|_next|_static|.*\\..*).*)',
  ],
}
