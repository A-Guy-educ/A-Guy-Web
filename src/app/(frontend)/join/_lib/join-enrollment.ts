/**
 * Client side of /join: enroll in the picked class, or, when signed out,
 * remember the class and go through Google sign-in first.
 *
 * The picked class survives the OAuth round-trip in sessionStorage (same tab,
 * same origin) rather than in the returnTo URL, so a shared link can't enroll
 * someone into a class they never chose.
 *
 * @fileType utility
 * @domain classroom
 */

const PENDING_CLASS_KEY = 'aguy:join:pending-class'

/** Query flag on the post-sign-in return URL that resumes the pending join. */
export const RESUME_PARAM = 'resume'

export const GOOGLE_SIGN_IN_HREF = `/api/oauth/google?returnTo=${encodeURIComponent(
  `/join?${RESUME_PARAM}=1`,
)}`

export type EnrollOutcome =
  | { kind: 'enrolled'; courseHref: string }
  | { kind: 'signInRequired' }
  | { kind: 'classNotFound' }
  | { kind: 'failed' }

export async function requestEnroll(classId: string): Promise<EnrollOutcome> {
  const res = await fetch('/api/join/enroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ classId }),
  })
  if (res.status === 401) return { kind: 'signInRequired' }
  if (res.status === 404) return { kind: 'classNotFound' }
  if (!res.ok) return { kind: 'failed' }

  const data = (await res.json()) as { courseHref?: unknown }
  return typeof data.courseHref === 'string' && data.courseHref.startsWith('/')
    ? { kind: 'enrolled', courseHref: data.courseHref }
    : { kind: 'failed' }
}

export function savePendingClass(classId: string): void {
  try {
    sessionStorage.setItem(PENDING_CLASS_KEY, classId)
  } catch {
    // Storage blocked: the student just picks the class again after sign-in.
  }
}

/** Reads and clears the pending class, so a reload doesn't re-run the join. */
export function takePendingClass(): string | null {
  try {
    const classId = sessionStorage.getItem(PENDING_CLASS_KEY)
    sessionStorage.removeItem(PENDING_CLASS_KEY)
    return classId
  } catch {
    return null
  }
}
