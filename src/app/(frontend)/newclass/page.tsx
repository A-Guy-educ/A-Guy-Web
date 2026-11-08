import type { Metadata } from 'next'

import { pageMetadata } from '@/infra/seo/pageMetadata'
import { AboutSection } from '@/ui/web/newclass/home/AboutSection'
import { ChallengesSection } from '@/ui/web/newclass/home/ChallengesSection'
import { CtaSection } from '@/ui/web/newclass/home/CtaSection'
import { DimsSection } from '@/ui/web/newclass/home/DimsSection'
import { HeroSection } from '@/ui/web/newclass/home/HeroSection'
import { PilotsSection } from '@/ui/web/newclass/home/PilotsSection'
import { ProgramsSection } from '@/ui/web/newclass/home/ProgramsSection'
import { ShiftSection } from '@/ui/web/newclass/home/ShiftSection'

export default function NewClassPage() {
  return (
    <>
      <HeroSection />
      <ShiftSection />
      <DimsSection />
      <ProgramsSection />
      <ChallengesSection />
      <PilotsSection />
      <AboutSection />
      <CtaSection />
    </>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'הכיתה החדשה 3D',
    description:
      'מתמטיקה לכיתות ז׳–י״ב בתוך שעות בית הספר: A-guy, מורה דיגיטלי עם תהליך הטמעה מלא, ולומדים ללמד, בני נוער שמלווים תלמידים בכיתה.',
  })
}
