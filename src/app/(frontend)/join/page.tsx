/**
 * Student Registration Page — /join
 *
 * Students arriving through their school pick school and class (from the
 * Admin-owned `schools` / `classes` collections), sign in with Google, get
 * added to the class roster and land on the class's course. Not linked from
 * anywhere yet.
 *
 * @fileType page
 * @domain classroom
 */

import { getDirection } from '@/i18n/config'
import { getSystemLocale } from '@/i18n/server-locale'
import { pageMetadata } from '@/infra/seo/pageMetadata'
import { listJoinableSchools } from '@/server/services/classroom/class-enrollment'
import { StudentJoinForm } from './_components/StudentJoinForm'
import { StudentJoinFootnote, StudentJoinHeader } from './_components/StudentJoinHeader'

export const dynamic = 'force-dynamic'

export default async function JoinPage() {
  const [locale, schools] = await Promise.all([getSystemLocale(), listJoinableSchools()])

  return (
    <div className="flex min-h-screen justify-center bg-background" dir={getDirection(locale)}>
      <main className="flex w-full max-w-[420px] flex-col gap-content-gap px-5 pb-6 pt-7">
        <StudentJoinHeader />
        <StudentJoinForm schools={schools} />
        <StudentJoinFootnote />
      </main>
    </div>
  )
}

export async function generateMetadata() {
  const locale = await getSystemLocale()
  const isHebrew = locale === 'he'

  return pageMetadata({
    title: isHebrew ? 'רישום תלמיד' : 'Student registration',
    description: isHebrew ? 'בוחרים כיתה ומתחילים ללמוד' : 'Pick your class and start learning',
    noIndex: true,
  })
}
