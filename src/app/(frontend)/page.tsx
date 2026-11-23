import { getSystemLocale } from '@/i18n/server-locale'
import { isValidContentLocale } from '@/infra/types/content'
import { getLandingDemoExercise } from '@/server/services/landing-demo-exercise'
import { PrivateLessonLanding } from '@/ui/web/homepage/PrivateLessonLanding'
import { resolveLandingRedirect } from '@/infra/onboarding/homeRedirect'
import { getMeUser } from '@/infra/utils/getMeUser'
import { mergeOpenGraph } from '@/infra/utils/mergeOpenGraph'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export default async function HomepagePage() {
  const { user } = await getMeUser()
  const destination = resolveLandingRedirect(Boolean(user))

  if (destination) {
    redirect(destination)
  }

  const locale = await getSystemLocale()
  const demoExercise = await getLandingDemoExercise(
    isValidContentLocale(locale) ? locale : undefined,
  )

  return <PrivateLessonLanding demoExerciseGroups={demoExercise?.groups ?? null} />
}

// Title shown in the browser tab and in WhatsApp / Facebook link previews.
const SHARE_TITLE = 'Aguy מורה פרטי AI'

export function generateMetadata(): Metadata {
  return {
    title: { absolute: SHARE_TITLE },
    description:
      'פלטפורמת למידה אישית למתמטיקה עם שיעורים, תרגול, מורה דיגיטלי, תוכנית אישית וזמינות מלאה.',
    openGraph: mergeOpenGraph({
      title: SHARE_TITLE,
      description: 'ממש כמו מורה פרטי, רק זמין יותר, משתלם יותר ומותאם בדיוק בשבילך.',
    }),
  }
}
