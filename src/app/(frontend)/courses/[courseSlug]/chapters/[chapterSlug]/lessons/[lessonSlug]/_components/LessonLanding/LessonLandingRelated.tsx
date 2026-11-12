'use client'

import type { LessonPrerequisite } from '@/infra/types/content'
import { SystemLink } from '@/infra/loading/components/SystemLink'
import { useTranslations } from '@/ui/web/providers/I18n'

import { LessonLandingSection } from './LessonLandingSection'

interface LessonLandingRelatedProps {
  keywords: string[]
  prerequisites: LessonPrerequisite[]
  nextLessonTitle?: string | null
}

export function LessonLandingRelated({
  keywords,
  prerequisites,
  nextLessonTitle,
}: LessonLandingRelatedProps) {
  const t = useTranslations('courses')
  if (keywords.length === 0 && prerequisites.length === 0 && !nextLessonTitle) return null

  const chip = 'rounded-full border border-border bg-card px-3 py-1.5 text-body-sm'

  return (
    <LessonLandingSection
      id="related"
      title={t('lessonLandingRelatedTitle')}
      subtitle={t('lessonLandingRelatedSubtitle')}
    >
      <div className="space-y-content-gap-sm">
        {keywords.length > 0 ? (
          <ul className="flex flex-wrap gap-content-gap-xs">
            {keywords.map((keyword) => (
              <li key={keyword} className={`${chip} text-secondary`}>
                {keyword}
              </li>
            ))}
          </ul>
        ) : null}
        {prerequisites.length > 0 ? (
          <div>
            <p className="mb-2 text-label uppercase tracking-wider text-muted-foreground">
              {t('lessonLobbyPrerequisites')}
            </p>
            <ul className="flex flex-wrap gap-content-gap-xs">
              {prerequisites.map((prereq) => (
                <li key={prereq.id}>
                  <SystemLink
                    href={`/courses/${prereq.courseSlug}/chapters/${prereq.chapterSlug}/lessons/${prereq.slug}`}
                    className={`${chip} block font-medium text-foreground transition-colors hover:text-primary`}
                  >
                    {prereq.title}
                  </SystemLink>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {nextLessonTitle ? (
          <p className="text-body-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{t('lessonLobbyNextLesson')}:</span>{' '}
            {nextLessonTitle}
          </p>
        ) : null}
      </div>
    </LessonLandingSection>
  )
}
