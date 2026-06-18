import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { COURSE_ID_COOKIE_NAME } from '@/client/state/localStorage/userProfile'
import { resolveHomeRedirect } from '@/infra/onboarding/homeRedirect'
import { getMeUser } from '@/infra/utils/getMeUser'
import { NewStartPage } from './_components/NewStartPage'
import { getSystemLocale } from '@/i18n/server-locale'
import { pageMetadata } from '@/infra/seo/pageMetadata'
import type { Metadata } from 'next'

export const revalidate = 60

export default async function StartPage() {
  const { user } = await getMeUser()
  const cookieStore = await cookies()
  const selectedCourseId = cookieStore.get(COURSE_ID_COOKIE_NAME)?.value

  const destination = resolveHomeRedirect({
    isAuthenticated: Boolean(user),
    selectedCourseId,
  })

  if (destination !== '/start') {
    redirect(destination)
  }

  return <NewStartPage />
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getSystemLocale()
  const isHebrew = locale === 'he'

  return pageMetadata({
    title: isHebrew ? 'A-Guy - כניסה למערכת הלמידה החכמה' : 'A-Guy - Smart Learning System',
    description: isHebrew
      ? 'מערכת למידה אישית למתמטיקה עם שיעורים, תרגול, שאלות ומבחנים.'
      : 'Personal math learning system with lessons, practice, questions, and exams.',
  })
}
