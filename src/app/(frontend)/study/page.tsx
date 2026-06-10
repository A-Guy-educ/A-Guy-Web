import { cookies } from 'next/headers'
import { getSystemLocale } from '@/i18n/server-locale'
import { isValidContentLocale } from '@/infra/types/content'
import { COURSE_ID_COOKIE_NAME, GRADE_COOKIE_NAME } from '@/client/state/localStorage/userProfile'
import { pageMetadata } from '@/infra/seo/pageMetadata'
import { StudyContent } from './_components/StudyContent'
import { prefetchStudyData } from '@/server/repos/queries/study-page'

export default async function StudyPage() {
  const cookieStore = await cookies()
  const grade = cookieStore.get(GRADE_COOKIE_NAME)?.value
  const courseId = cookieStore.get(COURSE_ID_COOKIE_NAME)?.value
  const locale = await getSystemLocale()
  const contentLocale = isValidContentLocale(locale) ? locale : undefined

  // Server-side prefetch when grade is known (direct DB, no HTTP round-trip)
  const prefetchedData = grade
    ? await prefetchStudyData(grade, contentLocale, 'learning', courseId)
    : null

  return (
    <div>
      <StudyContent lessonType="learning" prefetchedData={prefetchedData} />
    </div>
  )
}

export async function generateMetadata() {
  return pageMetadata({
    title: 'לימוד',
    description: 'בחר נושא ללימוד',
  })
}
