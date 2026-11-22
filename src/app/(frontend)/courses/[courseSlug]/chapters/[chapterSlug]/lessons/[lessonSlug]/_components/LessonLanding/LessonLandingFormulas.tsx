'use client'

import { splitExplanationBullets } from '@/lib/lessons/splitExplanationBullets'
import { useTranslations } from '@/ui/web/providers/I18n'

import { LessonLandingBulletList } from './LessonLandingBulletList'
import { LessonLandingSection } from './LessonLandingSection'

interface LessonLandingFormulasProps {
  formulas?: string | null
}

export function LessonLandingFormulas({ formulas }: LessonLandingFormulasProps) {
  const t = useTranslations('courses')
  // Same one-bullet-per-line / sentence rule as the explanation section.
  const bullets = splitExplanationBullets(formulas)
  if (bullets.length === 0) return null

  return (
    <LessonLandingSection
      id="formulas"
      title={t('lessonLandingFormulasTitle')}
      subtitle={t('lessonLandingFormulasSubtitle')}
    >
      <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-card-padding">
        <LessonLandingBulletList bullets={bullets} />
      </div>
    </LessonLandingSection>
  )
}
