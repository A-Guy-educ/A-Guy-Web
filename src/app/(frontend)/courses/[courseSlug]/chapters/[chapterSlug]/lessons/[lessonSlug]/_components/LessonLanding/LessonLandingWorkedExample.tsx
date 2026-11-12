'use client'

import type { LessonLandingWorkedExample as WorkedExample } from '@/lib/lessons/buildLessonLanding'
import { useTranslations } from '@/ui/web/providers/I18n'
import { MathMarkdown } from '@/ui/web/shared/MathMarkdown'

import { LessonLandingSection } from './LessonLandingSection'

interface LessonLandingWorkedExampleProps {
  example: WorkedExample | null
  /** Admin's free-text `examples` field, used when no exercise has a full solution. */
  fallbackText?: string | null
}

export function LessonLandingWorkedExample({
  example,
  fallbackText,
}: LessonLandingWorkedExampleProps) {
  const t = useTranslations('courses')
  if (!example && !fallbackText) return null

  return (
    <LessonLandingSection
      id="solved"
      title={t('lessonLandingWorkedTitle')}
      subtitle={t('lessonLandingWorkedSubtitle')}
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {example ? (
          <>
            <div className="border-b border-border bg-muted/50 p-card-padding">
              {example.exerciseTitle ? (
                <p className="text-body-xs font-semibold text-secondary">{example.exerciseTitle}</p>
              ) : null}
              <MathMarkdown
                content={example.prompt}
                className="mt-1 text-heading-sm text-foreground"
              />
            </div>
            <MathMarkdown
              content={example.solution}
              className="p-card-padding text-body-md leading-relaxed text-foreground"
            />
            {example.answer ? (
              <div className="flex flex-wrap items-center gap-content-gap-xs border-t border-border bg-secondary/10 px-card-padding py-card-padding-sm">
                <span className="text-body-sm font-semibold text-secondary">
                  {t('lessonLandingAnswer')}
                </span>
                <MathMarkdown content={example.answer} className="text-body-md text-foreground" />
              </div>
            ) : null}
          </>
        ) : (
          <MathMarkdown
            content={fallbackText ?? ''}
            className="p-card-padding text-body-md leading-relaxed text-foreground"
          />
        )}
      </div>
    </LessonLandingSection>
  )
}
