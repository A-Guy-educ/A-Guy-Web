import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getTeacherAppUrl } from '@/infra/config/teacher-app'
import { pageMetadata } from '@/infra/seo/pageMetadata'
import { getMeUser } from '@/infra/utils/getMeUser'
import { canUseTeacherDashboard } from '@/server/services/teacher-dashboard/teacher-class-access'
import { NotTeacherNotice } from '@/ui/web/classdemo/NotTeacherNotice'

export const dynamic = 'force-dynamic'

const LOGIN_THEN_BACK_HERE = `/login?returnTo=${encodeURIComponent('/classdemo/teacher')}`

// "I'm a teacher" from /classdemo. Signed-out visitors log in and come back
// here; teachers (and admins) continue to the teacher app; anyone else sees why
// they can't. /login ignores returnTo once signed in, hence this hop.
export default async function ClassDemoTeacherPage() {
  const { user } = await getMeUser()

  if (!user) redirect(LOGIN_THEN_BACK_HERE)
  if (canUseTeacherDashboard(user.role)) redirect(getTeacherAppUrl())

  return <NotTeacherNotice />
}

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ title: 'מרחב המורה — הכיתה החדשה', noIndex: true })
}
