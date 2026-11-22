'use client'

import { Sparkles } from 'lucide-react'

import { splitExplanationBullets } from '@/lib/lessons/splitExplanationBullets'
import { useTranslations } from '@/ui/web/providers/I18n'
import { MathMarkdown } from '@/ui/web/shared/MathMarkdown'

import { LessonLandingBulletList } from './LessonLandingBulletList'
import { LessonLandingSection } from './LessonLandingSection'

interface LessonLandingExplanationProps {
  explanation?: string | null
  commonMistakes?: string | null
}

export function LessonLandingExplanation({
  explanation,
  commonMistakes,
}: LessonLandingExplanationProps) {
  const t = useTranslations('courses')
  // One bullet per line / sentence — admin line breaks would otherwise be
  // collapsed by markdown into a single run-on paragraph.
  const bullets = splitExplanationBullets(explanation)
  if (bullets.length === 0 && !commonMistakes) return null

  return (
    <LessonLandingSection
      id="explain"
      title={t('lessonLandingExplainTitle')}
      subtitle={t('lessonLandingExplainSubtitle')}
    >
      <div className="grid gap-content-gap-sm md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)]">
        {bullets.length > 0 ? (
          <div className="rounded-xl border border-border bg-card p-card-padding">
            <LessonLandingBulletList bullets={bullets} />
          </div>
        ) : null}
        {commonMistakes ? (
          <aside className="rounded-xl border border-primary/20 bg-primary-soft p-card-padding">
            <Sparkles className="mb-2 h-5 w-5 text-primary" />
            <h3 className="text-heading-md font-semibold text-foreground">
              {t('lessonLandingMistakeTitle')}
            </h3>
            <MathMarkdown
              content={commonMistakes}
              className="mt-2 text-body-sm leading-relaxed text-muted-foreground"
            />
          </aside>
        ) : null}
      </div>
    </LessonLandingSection>
  )
}
