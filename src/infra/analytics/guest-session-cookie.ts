/**
 * Shared constants for the anonymous-visitor tracking cookie.
 *
 * Written by middleware on the visitor's first landing (before signup) and
 * read by the Google OAuth callback to link the newly-created user back to
 * the guest doc. Feeds the dashboard's guest-sessions tile: total lands vs.
 * lands that later became a real signup.
 */

export const GUEST_SESSION_COOKIE = 'guest_session_id'

/** Matches the "landed but skipped signup" window we care about. */
export const GUEST_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

/**
 * Request header the middleware attaches when it decides to open a new
 * guest session. Consumed by the root layout to fire the fire-and-forget DB
 * insert on the same request.
 */
export const NEW_GUEST_SESSION_HEADER = 'x-new-guest-session-id'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Only trust cookie values we ourselves wrote. Prevents callers from smuggling
 * arbitrary strings into the DB via `guest_session_id`.
 */
export function isValidGuestSessionId(value: string | undefined | null): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}
