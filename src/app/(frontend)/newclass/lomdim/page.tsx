import type { Metadata } from 'next'

import { pageMetadata } from '@/infra/seo/pageMetadata'
import {
  LomdimBenefits,
  LomdimClose,
  LomdimHero,
  LomdimResults,
  LomdimSteps,
} from '@/ui/web/newclass/lomdim/LomdimSections'

export default function LomdimProgramPage() {
  return (
    <>
      <LomdimHero />
      <LomdimBenefits />
      <LomdimSteps />
      <LomdimResults />
      <LomdimClose />
    </>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'לומדים ללמד · הכיתה החדשה 3D',
    description:
      'תלמידים בוגרים עוברים 30 שבועות של הכשרה והתנסות, והופכים לתומכי הוראה שעוזרים למורים בזמן השיעור.',
  })
}
