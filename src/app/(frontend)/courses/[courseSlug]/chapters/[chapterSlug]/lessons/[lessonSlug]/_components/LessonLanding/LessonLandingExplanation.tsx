'use client'

import { Sparkles } from 'lucide-react'

import { useTranslations } from '@/ui/web/providers/I18n'
import { MathMarkdown } from '@/ui/web/shared/MathMarkdown'

import { LessonLandingSection } from './LessonLandingSection'

interface LessonLandingExplanationProps {
  explanation?: string | null
  formulas?: string | null
  commonMistakes?: string | null
}

export function LessonLandingExplanation({
  explanation,
  formulas,
  commonMistakes,
}: LessonLandingExplanationProps) {
  const t = useTranslations('courses')
  if (!explanation && !formulas && !commonMistakes) return null

  return (
    <LessonLandingSection
      id="explain"
      title={t('lessonLandingExplainTitle')}
      subtitle={t('lessonLandingExplainSubtitle')}
    >
      <div className="grid gap-content-gap-sm md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)]">
        {explanation || formulas ? (
          <div className="space-y-content-gap-sm rounded-xl border border-border bg-card p-card-padding">
            {explanation ? (
              <MathMarkdown
                content={explanation}
                className="text-body-md leading-relaxed text-foreground"
              />
            ) : null}
            {formulas ? (
              <div className="rounded-lg border border-secondary/30 bg-secondary/10 p-card-padding-sm text-center">
                <MathMarkdown content={formulas} className="text-body-lg text-foreground" />
              </div>
            ) : null}
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
