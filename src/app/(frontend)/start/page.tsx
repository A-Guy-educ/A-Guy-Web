import { NewStartPage } from './_components/NewStartPage'
import { getSystemLocale } from '@/i18n/server-locale'
import { pageMetadata } from '@/infra/seo/pageMetadata'
import type { Metadata } from 'next'

export const revalidate = 60

export default async function StartPage() {
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
