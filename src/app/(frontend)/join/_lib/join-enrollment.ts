/**
 * Client side of /join: enroll in the picked class, or, when signed out,
 * remember the class and the student's details and go through Google
 * sign-in first.
 *
 * The pending join survives the OAuth round-trip in sessionStorage (same tab,
 * same origin) rather than in the returnTo URL, so a shared link can't enroll
 * someone into a class they never chose, and the phone number never lands in
 * a URL.
 *
 * @fileType utility
 * @domain classroom
 */

import { isJoinProfile, type JoinProfile } from './join-profile'

const PENDING_JOIN_KEY = 'aguy:join:pending'

/** Query flag on the post-sign-in return URL that resumes the pending join. */
export const RESUME_PARAM = 'resume'

export const GOOGLE_SIGN_IN_HREF = `/api/oauth/google?returnTo=${encodeURIComponent(
  `/join?${RESUME_PARAM}=1`,
)}`

export interface PendingJoin {
  classId: string
  profile: JoinProfile
}

export type EnrollOutcome =
  | { kind: 'enrolled'; courseHref: string }
  | { kind: 'signInRequired' }
  | { kind: 'classNotFound' }
  | { kind: 'failed' }

export async function requestEnroll({ classId, profile }: PendingJoin): Promise<EnrollOutcome> {
  const res = await fetch('/api/join/enroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ classId, profile }),
  })
  if (res.status === 401) return { kind: 'signInRequired' }
  if (res.status === 404) return { kind: 'classNotFound' }
  if (!res.ok) return { kind: 'failed' }

  const data = (await res.json()) as { courseHref?: unknown }
  return typeof data.courseHref === 'string' && data.courseHref.startsWith('/')
    ? { kind: 'enrolled', courseHref: data.courseHref }
    : { kind: 'failed' }
}

export function savePendingJoin(pending: PendingJoin): void {
  try {
    sessionStorage.setItem(PENDING_JOIN_KEY, JSON.stringify(pending))
  } catch {
    // Storage blocked: the student just fills the form again after sign-in.
  }
}

/** Reads and clears the pending join, so a reload doesn't re-run it. */
export function takePendingJoin(): PendingJoin | null {
  try {
    const raw = sessionStorage.getItem(PENDING_JOIN_KEY)
    sessionStorage.removeItem(PENDING_JOIN_KEY)
    const pending = raw ? (JSON.parse(raw) as Partial<PendingJoin>) : null
    return pending && typeof pending.classId === 'string' && isJoinProfile(pending.profile)
      ? { classId: pending.classId, profile: pending.profile }
      : null
  } catch {
    return null
  }
}
