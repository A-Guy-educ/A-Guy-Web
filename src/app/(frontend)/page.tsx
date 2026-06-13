import { DemoLandingPage } from '@/ui/web/homepage/DemoLandingPage'
import type { Metadata } from 'next'

export default async function HomepagePage() {
  return <DemoLandingPage />
}

export function generateMetadata(): Metadata {
  return {
    title: 'Aguy - הדור הבא של הלמידה',
    description:
      'פלטפורמת למידה אישית למתמטיקה עם שיעורים, תרגול, מורה דיגיטלי, תוכנית אישית וזמינות מלאה.',
    openGraph: {
      title: 'Aguy - הדור הבא של הלמידה',
      description: 'ממש כמו מורה פרטי, רק זמין יותר, משתלם יותר ומותאם בדיוק בשבילך.',
      images: [{ url: '/website-template-OG.webp' }],
    },
  }
}
