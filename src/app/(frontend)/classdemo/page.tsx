import type { Metadata } from 'next'

import { pageMetadata } from '@/infra/seo/pageMetadata'
import { ClassDemo } from '@/ui/web/classdemo/ClassDemo'

export default function ClassDemoPage() {
  return <ClassDemo />
}

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'הכיתה החדשה — דמו',
    description:
      'הדגמה אינטראקטיבית: המורה פותח שיעורים לכיתה, התלמידים מתכוננים בעצמם, והכיתה מגיעה מוכנה.',
    noIndex: true,
  })
}
