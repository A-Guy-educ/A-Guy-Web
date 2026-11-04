import { cookies } from 'next/headers'

import { COURSE_ID_COOKIE_NAME, GRADE_COOKIE_NAME } from '@/client/state/localStorage/userProfile'
import { STORAGE_OWNER_COOKIE_NAME } from '@/client/state/localStorage/userScopedStorage'
import {
  pickCourseSelection,
  type PickedCourseSelection,
} from '@/infra/onboarding/courseSelectionSource'
import { getMeUser } from '@/infra/utils/getMeUser'
import { getCourseSelection } from '@/server/services/user-course-selection'

export interface RequestCourseSelection extends PickedCourseSelection {
  isAuthenticated: boolean
}

/**
 * Course selection for the current request. Signed-in users get their server
 * record unless the course cookies are tagged as theirs — see
 * `pickCourseSelection` for the rules.
 */
export async function readRequestCourseSelection(): Promise<RequestCourseSelection> {
  const [{ user }, cookieStore] = await Promise.all([getMeUser(), cookies()])
  const server = user ? await getCourseSelection(user.currentCourse) : null

  const picked = pickCourseSelection({
    userId: user?.id ?? null,
    cookies: {
      courseId: cookieStore.get(COURSE_ID_COOKIE_NAME)?.value,
      grade: cookieStore.get(GRADE_COOKIE_NAME)?.value,
      owner: cookieStore.get(STORAGE_OWNER_COOKIE_NAME)?.value,
    },
    server,
  })

  return { ...picked, isAuthenticated: Boolean(user) }
}
