'use client'

import type { LessonLandingQuestion } from '@/lib/lessons/buildLessonLanding'
import { useTranslations } from '@/ui/web/providers/I18n'

import { LessonLandingPracticeCard } from './LessonLandingPracticeCard'
import { LessonLandingSection } from './LessonLandingSection'

export function LessonLandingPractice({ questions }: { questions: LessonLandingQuestion[] }) {
  const t = useTranslations('courses')
  if (questions.length === 0) return null

  return (
    <LessonLandingSection
      id="practice"
      title={t('lessonLandingPracticeTitle')}
      subtitle={t('lessonLandingPracticeSubtitle')}
    >
      <div className="grid gap-content-gap-sm md:grid-cols-2 lg:grid-cols-3">
        {questions.map((question, index) => (
          <LessonLandingPracticeCard key={question.id} question={question} number={index + 1} />
        ))}
      </div>
    </LessonLandingSection>
  )
}
