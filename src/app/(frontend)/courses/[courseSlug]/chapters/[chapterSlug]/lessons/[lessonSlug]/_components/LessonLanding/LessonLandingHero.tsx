'use client'

import { ChevronLeft, Clock, Layers, RotateCcw, Target } from 'lucide-react'

import type { ContentBlock } from '@/infra/types/exercise'
import { Button } from '@/ui/web/components/button'
import { Progress } from '@/ui/web/components/progress'
import { useTranslations } from '@/ui/web/providers/I18n'
import { MathMarkdown } from '@/ui/web/shared/MathMarkdown'

import { LessonLandingVisual } from './LessonLandingVisual'

export interface LessonLandingHeroProps {
  breadcrumb: string[]
  title: string
  description: string
  intro?: string | null
  objective?: string | null
  estimatedMinutes?: number | null
  exerciseCount: number
  visual: ContentBlock | null
  primaryLabel: string
  progressPercent: number
  showRestart: boolean
  onStart: () => void
  onRestart: () => void
}

export function LessonLandingHero({
  breadcrumb,
  title,
  description,
  intro,
  objective,
  estimatedMinutes,
  exerciseCount,
  visual,
  primaryLabel,
  progressPercent,
  showRestart,
  onStart,
  onRestart,
}: LessonLandingHeroProps) {
  const t = useTranslations('courses')
  const metricClass =
    'inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-body-sm text-muted-foreground'

  return (
    <section
      aria-labelledby="lesson-title"
      className="overflow-hidden rounded-2xl border border-border bg-gradient-to-l from-card via-card to-secondary/10 p-card-padding shadow-card md:p-card-padding-lg lg:p-section-xs"
    >
      <div className="grid items-center gap-content-gap-lg lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="space-y-4 md:space-y-5">
          {breadcrumb.length > 0 ? (
            <p className="text-body-sm font-semibold text-secondary">{breadcrumb.join(' · ')}</p>
          ) : null}
          <h1
            id="lesson-title"
            className="text-heading-xl font-semibold leading-tight text-foreground md:text-display-lg"
          >
            {title}
          </h1>
          {description ? (
            <MathMarkdown
              content={description}
              className="text-body-lg font-medium text-primary-text md:text-body-xl"
            />
          ) : null}
          {intro ? (
            <MathMarkdown content={intro} className="text-body-md text-muted-foreground" />
          ) : null}

          <div className="flex flex-wrap gap-content-gap-xs">
            {estimatedMinutes ? (
              <span className={metricClass}>
                <Clock className="h-4 w-4 text-primary" />
                {t('lessonLandingMinutes').replace('{{minutes}}', String(estimatedMinutes))}
              </span>
            ) : null}
            {exerciseCount > 0 ? (
              <span className={metricClass}>
                <Layers className="h-4 w-4 text-primary" />
                {t('lessonLandingExercises').replace('{{count}}', String(exerciseCount))}
              </span>
            ) : null}
            <span className={metricClass}>{t('lessonLandingPace')}</span>
          </div>

          {objective ? (
            <p className="flex items-start gap-content-gap-xs text-body-sm text-muted-foreground">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
              <span>
                <span className="font-semibold text-foreground">{t('lessonLandingObjective')}</span>{' '}
                {objective}
              </span>
            </p>
          ) : null}

          <div className="flex flex-col gap-content-gap-xs sm:flex-row sm:items-center">
            <Button onClick={onStart} size="lg" className="sm:min-w-56">
              {primaryLabel}
              <ChevronLeft className="ms-2 h-5 w-5 rtl:rotate-0 ltr:rotate-180" />
            </Button>
            {showRestart ? (
              <Button onClick={onRestart} variant="outline" size="lg">
                <RotateCcw className="me-2 h-4 w-4" />
                {t('lessonLobbyRestart')}
              </Button>
            ) : null}
          </div>
          {progressPercent > 0 ? (
            <div className="flex max-w-sm items-center gap-content-gap-xs">
              <Progress value={progressPercent} className="h-2" />
              <span className="text-body-xs text-muted-foreground" dir="ltr">
                {progressPercent}%
              </span>
            </div>
          ) : null}
        </div>

        {visual ? <LessonLandingVisual block={visual} /> : null}
      </div>
    </section>
  )
}
