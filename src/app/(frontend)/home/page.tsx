import { redirect } from 'next/navigation'

import { resolveHomeRedirect } from '@/infra/onboarding/homeRedirect'
import { queryCourseSlugById } from '@/server/repos/queries/courses'

import { readRequestCourseSelection } from '../study/requestCourseSelection'

export const metadata = { title: 'Home' }

export default async function HomePage() {
  const { courseId, isAuthenticated } = await readRequestCourseSelection()

  redirect(
    await resolveHomeRedirect({
      isAuthenticated,
      selectedCourseId: courseId,
      resolveCourseSlug: queryCourseSlugById,
    }),
  )
}
