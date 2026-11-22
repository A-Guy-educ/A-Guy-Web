/**
 * Whether the student hid the course guide panel ("מה עושים היום?"). SSR-safe.
 *
 * One flag for every course: a student who knows their way around hides it
 * once. User-scoped (prefix listed in USER_SCOPED_KEY_PREFIXES), so on a
 * shared school computer the next student sees the guide again.
 */

export const COURSE_GUIDE_HIDDEN_KEY = 'aguy:courseGuideHidden'

export function readCourseGuideHidden(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(COURSE_GUIDE_HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}

export function writeCourseGuideHidden(hidden: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (hidden) localStorage.setItem(COURSE_GUIDE_HIDDEN_KEY, '1')
    else localStorage.removeItem(COURSE_GUIDE_HIDDEN_KEY)
  } catch {
    // Storage blocked: the choice lasts for this page view only.
  }
}
