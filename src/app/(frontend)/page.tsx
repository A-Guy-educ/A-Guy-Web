import { DemoLandingPage } from '@/ui/web/homepage/DemoLandingPage'
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

  return <DemoLandingPage />
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
