/**
 * Student Registration Page — /join
 *
 * First-time registration for students arriving through their school: pick
 * school and class, enter name and phone, start learning. Built from the
 * product demo. Not linked from anywhere yet, and submit is stubbed until the
 * phone-signup backend exists (see `_lib/student-registration.ts`).
 *
 * @fileType page
 * @domain schools
 */

import { getDirection } from '@/i18n/config'
import { getSystemLocale } from '@/i18n/server-locale'
import { pageMetadata } from '@/infra/seo/pageMetadata'
import { StudentJoinForm } from './_components/StudentJoinForm'
import { StudentJoinFootnote, StudentJoinHeader } from './_components/StudentJoinHeader'

export const dynamic = 'force-dynamic'

export default async function JoinPage() {
  const locale = await getSystemLocale()

  return (
    <div className="flex min-h-screen justify-center bg-background" dir={getDirection(locale)}>
      <main className="flex w-full max-w-[420px] flex-col gap-content-gap px-5 pb-6 pt-7">
        <StudentJoinHeader />
        <StudentJoinForm />
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
    description: isHebrew ? 'כמה פרטים קצרים ומתחילים ללמוד' : 'A few quick details and you’re in',
    noIndex: true,
  })
}
