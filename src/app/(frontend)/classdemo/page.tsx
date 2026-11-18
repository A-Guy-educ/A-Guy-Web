import type { Metadata } from 'next'

import { pageMetadata } from '@/infra/seo/pageMetadata'
import { ClassRolePicker } from '@/ui/web/classdemo/ClassRolePicker'

export default function ClassDemoPage() {
  return <ClassRolePicker />
}

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'כניסה / הרשמה — הכיתה החדשה',
    description: 'תלמידים מצטרפים לכיתה שלהם, מורים נכנסים למרחב המורה.',
    noIndex: true,
  })
}
