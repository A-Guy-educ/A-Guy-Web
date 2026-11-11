'use client'

import { useState } from 'react'

import type { LessonLandingQuestion } from '@/lib/lessons/buildLessonLanding'
import { cn } from '@/infra/utils/ui'
import { useTranslations } from '@/ui/web/providers/I18n'
import { MathMarkdown } from '@/ui/web/shared/MathMarkdown'

interface LessonLandingPracticeCardProps {
  question: LessonLandingQuestion
  number: number
}

export function LessonLandingPracticeCard({ question, number }: LessonLandingPracticeCardProps) {
  const t = useTranslations('courses')
  const [chosenId, setChosenId] = useState<string | null>(null)
  const isCorrect = chosenId === question.correctOptionId

  return (
    <article className="flex flex-col rounded-xl border border-border bg-card p-card-padding">
      <div className="flex justify-between gap-content-gap-xs text-body-xs text-muted-foreground">
        <span>{t('lessonLandingPracticeLabel').replace('{{number}}', String(number))}</span>
        {question.level ? <span>{question.level}</span> : null}
      </div>
      <MathMarkdown
        content={question.prompt}
        className="mt-2 text-body-md font-medium text-foreground"
      />
      <div className="mt-content-gap-xs grid gap-content-gap-xs">
        {question.options.map((option) => {
          const isChosen = option.id === chosenId
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isChosen}
              onClick={() => setChosenId(option.id)}
              className={cn(
                'rounded-lg border px-3 py-2 text-start text-body-sm transition-colors duration-normal',
                !isChosen && 'border-border bg-background hover:bg-hover',
                isChosen && isCorrect && 'border-success bg-success/10',
                isChosen && !isCorrect && 'border-error bg-error/10',
              )}
            >
              <MathMarkdown content={option.text} />
            </button>
          )
        })}
      </div>
      <div role="status" aria-live="polite" className="mt-content-gap-xs text-body-sm">
        {chosenId && isCorrect ? (
          <p className="font-medium text-success">{t('lessonLandingCorrect')}</p>
        ) : null}
        {chosenId && !isCorrect ? (
          <div className="text-muted-foreground">
            <p className="font-medium text-error">{t('lessonLandingIncorrect')}</p>
            {question.hint ? (
              <MathMarkdown content={`${t('lessonLandingHint')} ${question.hint}`} />
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}
