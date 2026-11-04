/**
 * Best-effort sync of the user's current course + last-active timestamp.
 *
 * POSTs same-origin to Web's `/api/users/me/course-state`, which verifies
 * the Web session and forwards to Admin server-to-server with a shared
 * service token. Called directly to Admin would 401 — Web users have no
 * Admin cookie to send cross-origin. Admin stamps `lastLoginAt` on every
 * successful call; the body carries no timestamp (clients cannot forge
 * activity).
 *
 * Fire-and-forget: never awaited on the UX path, never surfaces errors to
 * callers, browser-only (SSR skips silently). Any failure — Web route
 * down, Admin unreachable, service-token misconfigured — must not break
 * the user's flow.
 *
 * Lives under `infra/` (the leaf layer) so it can be called from client,
 * infra, and app layers alike.
 *
 * Called from four sites:
 *   - `selectCourse` (explicit pick) — with the picked courseId
 *   - `useUserStorageOwnership` (signed-in page load) — pushes the local
 *     course when the server has none, after the shared-device ownership
 *     check has confirmed the local data belongs to this user
 *   - `UserIdentificationTracker` (first authenticated mount per session) —
 *     empty body, lastLoginAt-only heartbeat
 *   - `LessonAnalytics` (lesson open) — with the lesson's courseId, always
 *     overwriting server state (a live lesson open is the freshest signal)
 *
 * `clearCurrentCourse` is called from `removeCourseSelection`.
 */

const postCourseState = (body: { currentCourse?: string | null }): void => {
  if (typeof window === 'undefined') return

  try {
    void fetch('/api/users/me/course-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
      keepalive: true,
    }).catch(() => {
      /* intentional: telemetry must never break UX */
    })
  } catch {
    /* intentional: telemetry must never break UX */
  }
}

export const syncCurrentCourse = (courseId?: string | null): void => {
  postCourseState(courseId ? { currentCourse: courseId } : {})
}

/**
 * Clear the server's `currentCourse` (the student removed their course).
 * Explicit `null` — an omitted field means "heartbeat only".
 */
export const clearCurrentCourse = (): void => {
  postCourseState({ currentCourse: null })
}
