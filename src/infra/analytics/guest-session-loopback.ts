/**
 * Verification for the signed middleware → Node loopback calls
 * (`/api/internal/guest-session/create`, `/api/internal/bot-hits/record`).
 *
 * HMAC over the raw body with PAYLOAD_SECRET is the access boundary — no
 * cookie, no bearer token. Every rejection collapses to an opaque status for
 * external callers.
 */

import { signGuestPayload, timingSafeEqualHex } from './guest-session-signing'

export type SignedLoopbackResult = { ok: true; body: unknown } | { ok: false; status: 400 | 401 }

export async function verifySignedLoopbackWebhook(
  request: Request,
  secret: string,
): Promise<SignedLoopbackResult> {
  const signature = request.headers.get('x-signature')
  if (!signature) return { ok: false, status: 401 }

  const raw = await request.text()
  const expected = await signGuestPayload(raw, secret)
  if (!timingSafeEqualHex(signature, expected)) return { ok: false, status: 401 }

  try {
    return { ok: true, body: JSON.parse(raw) as unknown }
  } catch {
    return { ok: false, status: 400 }
  }
}
