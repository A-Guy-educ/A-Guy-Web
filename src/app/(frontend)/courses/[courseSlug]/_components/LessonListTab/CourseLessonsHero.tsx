/**
 * @fileType component
 * @domain frontend
 * @pattern lesson-roadmap-hero
 * @ai-summary Hero card at the top of the lessons roadmap. Shows overall progress ring, next-up lesson title (or an "all complete" state), and a Focus-Next button that opens + scrolls to the featured chapter. Accent color tracks the active tab (learn/practice/exams) via the tabColor prop.
 */

'use client'

import { ArrowLeft, Play } from 'lucide-react'
import { useTranslations } from '@/ui/web/providers/I18n'
import { formatMessage } from './formatMessage'
import { HeroProgressRing } from './HeroProgressRing'
import type { LessonRoadmapNode } from './lessonRoadmapTypes'

interface CourseLessonsHeroProps {
  completed: number
  total: number
  featured: LessonRoadmapNode | null
  /** The lesson that comes after `featured` in course order. Null on all-done. */
  suggestion: LessonRoadmapNode | null
  accentColor: string
  onFocusNext: () => void
  onFocusSuggestion: () => void
}

export function CourseLessonsHero({
  completed,
  total,
  featured,
  suggestion,
  accentColor,
  onFocusNext,
  onFocusSuggestion,
}: CourseLessonsHeroProps) {
  const t = useTranslations('coursePage')
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  const allDone = total > 0 && completed >= total

  const heroTitle = allDone
    ? t('roadmapAllComplete')
    : featured
      ? `${formatMessage(t('roadmapNextLessonPrefix'), { num: featured.displayIndex })}: ${featured.lesson.title}`
      : t('roadmapStartNext')

  return (
    <div className="mb-content-gap-xl">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-card-padding md:p-card-padding-lg">
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-[0.06] pointer-events-none"
          style={{ background: accentColor }}
          aria-hidden
        />
        <div
          className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full blur-3xl opacity-[0.04] pointer-events-none bg-primary"
          aria-hidden
        />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-content-gap">
          <div className="flex items-center gap-content-gap-sm w-full sm:w-auto min-w-0">
            <HeroProgressRing percent={percent} accentColor={accentColor} />
            <div className="text-start min-w-0 flex-1">
              <p className="text-body-xs font-semibold text-muted-foreground">
                {t('roadmapResume')}
              </p>
              <h3 className="text-body-lg font-bold text-foreground tracking-tight mt-1 line-clamp-2 break-words">
                {heroTitle}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-content-gap-xs w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onFocusNext}
              disabled={!featured}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-content-gap-xs bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-body-xs px-5 py-3 rounded-xl shadow-elevation-3 transition-opacity duration-normal"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{t('roadmapLessonContinue')}</span>
            </button>
          </div>
        </div>
      </div>

      {suggestion ? (
        <button
          type="button"
          onClick={onFocusSuggestion}
          className="mt-2 ms-1 inline-flex items-center gap-1.5 text-body-xs text-muted-foreground hover:text-primary transition-colors group"
        >
          <span className="text-muted-foreground">{t('roadmapNextLessonLabel')}:</span>
          <span className="font-bold text-primary underline underline-offset-2 decoration-primary/40 group-hover:decoration-primary line-clamp-1 text-start">
            {formatMessage(t('roadmapNextLessonPrefix'), { num: suggestion.displayIndex })}:{' '}
            {suggestion.lesson.title}
          </span>
          <ArrowLeft className="w-3.5 h-3.5 text-primary/70 shrink-0 rtl:rotate-0 ltr:rotate-180" />
        </button>
      ) : null}
    </div>
  )
}
