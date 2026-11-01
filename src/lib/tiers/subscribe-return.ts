/**
 * Subscribe-and-come-back links.
 *
 * Every upsell wall (token quota mid-lesson, locked learning exercises,
 * locked practice/exam lessons, daily chat questions) sends the student to
 * `/subscriptions`. The page they came from rides along as `?returnTo=` and
 * is threaded through checkout so `/checkout/success` can send them back.
 *
 * Only same-site relative paths survive sanitization — the value ends up in a
 * redirect after payment, so anything that could leave the site (absolute
 * URLs, `//host`, backslash tricks) is dropped. Paths inside the purchase
 * funnel itself are dropped too, so a stale link can't loop the student back
 * into checkout.
 *
 * Client-safe: no server imports.
 *
 * @fileType utility
 * @domain billing
 */

export const SUBSCRIPTIONS_PATH = '/subscriptions'
export const RETURN_TO_PARAM = 'returnTo'

const MAX_RETURN_TO_LENGTH = 512
const FUNNEL_PREFIXES = ['/subscriptions', '/checkout', '/login', '/signup', '/onboarding']

function isFunnelPath(path: string): boolean {
  return FUNNEL_PREFIXES.some(
    (prefix) =>
      path === prefix ||
      path.startsWith(`${prefix}/`) ||
      path.startsWith(`${prefix}?`) ||
      path.startsWith(`${prefix}#`),
  )
}

/**
 * A same-site path safe to redirect to after subscribing, or `null` when the
 * input is missing or untrusted.
 */
export function sanitizeSubscribeReturnTo(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (!value || value.length > MAX_RETURN_TO_LENGTH) return null
  if (!value.startsWith('/') || value.startsWith('//')) return null
  // Backslashes and control characters let some browsers reinterpret the
  // path as protocol-relative (`/\evil.com`).
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null
  if (isFunnelPath(value)) return null
  return value
}

/** `/subscriptions`, carrying the page to return to when one is given. */
export function subscriptionsHref(returnTo?: string | null): string {
  const safe = sanitizeSubscribeReturnTo(returnTo)
  if (!safe) return SUBSCRIPTIONS_PATH
  return `${SUBSCRIPTIONS_PATH}?${RETURN_TO_PARAM}=${encodeURIComponent(safe)}`
}

/** Appends `returnTo` to an arbitrary path (e.g. the checkout success URL). */
export function withSubscribeReturnTo(path: string, returnTo?: string | null): string {
  const safe = sanitizeSubscribeReturnTo(returnTo)
  if (!safe) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}${RETURN_TO_PARAM}=${encodeURIComponent(safe)}`
}
