/**
 * HMAC helpers for the internal guest-session write endpoint.
 *
 * Middleware (Edge) mints a signature over the sessionId, and the Node-runtime
 * route verifies it before touching Mongo. Prevents anonymous callers from
 * inflating the funnel by POSTing arbitrary UUIDs to the internal path — the
 * route is on the public /api surface, so signature verification is what
 * makes it internal.
 */

const encoder = new TextEncoder()

function toHex(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes)
  let out = ''
  for (const b of view) out += b.toString(16).padStart(2, '0')
  return out
}

export async function signGuestSessionId(sessionId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(sessionId))
  return toHex(sig)
}

/**
 * Constant-time compare on hex strings. `crypto.timingSafeEqual` isn't
 * portable across Edge and Node, so we roll a small string-level version to
 * keep the signing module runtime-agnostic.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}
