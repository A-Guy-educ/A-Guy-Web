/**
 * @fileType utility
 * @domain onboarding
 * @pattern pure-decision
 * @ai-summary Decides whether a request's course selection comes from the browser cookies or from the signed-in user's server record. Cookies win only when they are tagged with this user's id, so a shared computer never shows one student another student's course.
 */

export interface CourseSelection {
  courseId: string
  gradeLevel: string
}

export interface CourseSelectionCookies {
  courseId?: string
  grade?: string
  /** User id the browser storage belongs to (`a-guy:owner` cookie). */
  owner?: string
}

export interface PickedCourseSelection {
  courseId?: string
  grade?: string
}

/**
 * - Guest → cookies (the only source a guest has).
 * - Signed in, cookies owned by this user and holding a course → cookies.
 *   They are the freshest value: a pick writes them synchronously, while the
 *   server copy is updated by a fire-and-forget request that may still be in
 *   flight.
 * - Signed in otherwise → the server record. Cookies owned by someone else, or
 *   by nobody, are ignored because on a shared computer they may belong to the
 *   previous student.
 */
export function pickCourseSelection({
  userId,
  cookies,
  server,
}: {
  userId: string | null
  cookies: CourseSelectionCookies
  server: CourseSelection | null
}): PickedCourseSelection {
  const fromCookies = { courseId: cookies.courseId, grade: cookies.grade }
  if (!userId) return fromCookies

  const ownedByUser = cookies.owner === userId
  if (ownedByUser && cookies.courseId) return fromCookies
  if (server) return { courseId: server.courseId, grade: server.gradeLevel }
  return ownedByUser ? fromCookies : {}
}
