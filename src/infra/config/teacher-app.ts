/**
 * Teacher App Location
 *
 * Where Web sends a signed-in teacher: the A-Guy-Teacher app ("teacher space").
 * Production is `teacher.aguy.co.il`; other environments override it with
 * `TEACHER_APP_URL`. Server-only — the variable is not exposed to the browser.
 */

const DEFAULT_TEACHER_APP_URL = 'https://teacher.aguy.co.il/'

export function getTeacherAppUrl(): string {
  const configured = process.env.TEACHER_APP_URL?.trim()
  if (!configured) return DEFAULT_TEACHER_APP_URL

  try {
    return new URL(configured).toString()
  } catch {
    return DEFAULT_TEACHER_APP_URL
  }
}
